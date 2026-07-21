# =============================================================================
#  test_vibesplit.py — VibeSplit Contract Integration Test Suite
# =============================================================================

import sys
import os
import json
import unittest
import py_compile
from unittest.mock import MagicMock

# ── Mocking structure to simulate the GenLayer SDK runtime ──────────────────
class MockContractBase:
    pass

class MockMessage:
    def __init__(self, sender="0x1111111111111111111111111111111111111111", value=0):
        self.sender_address = sender
        self.value = value

class MockWeb:
    def __init__(self):
        self.url_to_content = {}
        self.fail_on_next = False
    def render(self, url):
        if self.fail_on_next:
            raise Exception("Simulated scrape failure")
        if "404" in url:
            raise Exception("404 Link Blocked")
        if "empty" in url:
            return ""
        if "short" in url:
            return "short"
        return self.url_to_content.get(url, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.")

class MockNondet:
    def __init__(self):
        self.web = MockWeb()
        self.exec_prompt_responses = []
        self.response_index = 0
        self.fail_on_next = False
        
    def exec_prompt(self, prompt):
        if self.fail_on_next:
            raise Exception("Simulated LLM failure")
        if self.response_index < len(self.exec_prompt_responses):
            res = self.exec_prompt_responses[self.response_index]
            self.response_index += 1
            return res
        return json.dumps({
            "is_plagiarism": True,
            "original_artist_split": 70,
            "musicological_analysis": "Melodies share a highly similar sequence of notes."
        })

class MockVM:
    def __init__(self, mock_nondet):
        self.mock_nondet = mock_nondet
        self.fail_validator_render = False
        self.fail_validator_llm = False
    def run_nondet_unsafe(self, leader_fn, validator_fn):
        leader_res = leader_fn()
        if self.fail_validator_render:
            self.mock_nondet.web.fail_on_next = True
        if self.fail_validator_llm:
            self.mock_nondet.fail_on_next = True
        consensus = validator_fn(leader_res)
        
        # Reset flags
        self.mock_nondet.web.fail_on_next = False
        self.mock_nondet.fail_on_next = False
        
        if consensus:
            return leader_res
        raise RuntimeError("Consensus not reached")

class MockGl:
    def __init__(self):
        self.message = MockMessage()
        self.nondet = MockNondet()
        self.vm = MockVM(self.nondet)
        self.Contract = MockContractBase
        self.public = self._create_public_decorator()
        self.mock_transfers = {}

    def _create_public_decorator(self):
        class MockDecorator:
            def __call__(self, func):
                return func
            def __getattr__(self, name):
                return self
        class MockPublic:
            def __init__(self):
                self.view = MockDecorator()
                self.write = MockDecorator()
        return MockPublic()

    def get_contract_at(self, addr):
        mock_other = MagicMock()
        def emit_transfer_mock(value):
            self.mock_transfers[addr] = self.mock_transfers.get(addr, 0) + value
        mock_other.emit_transfer = emit_transfer_mock
        return mock_other

class MockTreeMap(dict):
    def get(self, key, default=None):
        return super().get(key, default)

# Inject mock genlayer sdk
mock_genlayer = MagicMock()
mock_genlayer.TreeMap = MockTreeMap
mock_genlayer.Address = str
mock_genlayer.u64 = int
mock_genlayer.u32 = int
mock_genlayer.u256 = int
mock_genlayer.i32 = int
mock_genlayer.gl = MockGl()
mock_genlayer.UserError = Exception

sys.modules['genlayer'] = mock_genlayer

# Adjust path to import the actual contract
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'contracts'))
from vibesplit import Contract

class TestVibeSplit(unittest.TestCase):
    def setUp(self):
        self.contract = Contract()
        self.contract.disputes_count = 0
        
        for field, f_type in self.contract.__class__.__annotations__.items():
            if 'TreeMap' in str(f_type):
                setattr(self.contract, field, MockTreeMap())
                
        # Reset Mock SDK state
        mock_genlayer.gl.message = MockMessage()
        mock_genlayer.gl.nondet.exec_prompt_responses = []
        mock_genlayer.gl.nondet.response_index = 0
        mock_genlayer.gl.nondet.web.fail_on_next = False
        mock_genlayer.gl.nondet.fail_on_next = False
        mock_genlayer.gl.vm.fail_validator_render = False
        mock_genlayer.gl.vm.fail_validator_llm = False
        mock_genlayer.gl.mock_transfers = {}

    def test_reproducible_compilation(self):
        # Verify the contract compiles without any python syntax errors
        contract_path = os.path.join(os.path.dirname(__file__), '..', 'contracts', 'vibesplit.py')
        try:
            compiled_path = py_compile.compile(contract_path, doraise=True)
            self.assertTrue(os.path.exists(compiled_path))
        except py_compile.PyCompileError as e:
            self.fail(f"Contract compilation failed: {str(e)}")

    def test_create_dispute_success(self):
        mock_genlayer.gl.message.sender_address = "0xOriginalArtistAddress"
        mock_genlayer.gl.message.value = 100 * 10**18
        
        accused = "0xAccusedArtistAddress"
        orig_url = "https://original-metadata.com/track"
        accu_url = "https://accused-metadata.com/track"
        
        did = self.contract.create_dispute(accused, orig_url, accu_url)
        
        self.assertEqual(did, 0)
        self.assertEqual(self.contract.disputes_count, 1)
        self.assertEqual(self.contract.dispute_original_artist[did], "0xOriginalArtistAddress")
        self.assertEqual(self.contract.dispute_accused_artist[did], accused)
        self.assertEqual(self.contract.dispute_original_stake[did], 100 * 10**18)
        self.assertEqual(self.contract.dispute_accused_stake[did], 0)
        self.assertEqual(self.contract.dispute_status[did], "CREATED")

    def test_create_dispute_studio_serialization(self):
        mock_genlayer.gl.message.sender_address = "0xOriginalArtistAddress"
        mock_genlayer.gl.message.value = 100 * 10**18
        
        # Test with integer address representation (similar to Studio input deserialization error)
        accused_int = 57966607193583215973838246498738116913836465038
        expected_hex = "0x0a2750043b217267493b4bb5b856107840361b8e"
        
        did = self.contract.create_dispute(accused_int, "https://orig.com", "https://accu.com")
        self.assertEqual(self.contract.dispute_accused_artist[did], expected_hex)

    def test_create_dispute_invalid_stake(self):
        mock_genlayer.gl.message.value = 0
        with self.assertRaises(Exception) as context:
            self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        self.assertIn("positive GEN amount", str(context.exception))

    def test_create_dispute_invalid_urls(self):
        mock_genlayer.gl.message.value = 10 * 10**18
        # Empty url
        with self.assertRaises(Exception) as context:
            self.contract.create_dispute("0xAccused", "", "https://url.com/b")
        self.assertIn("cannot be empty", str(context.exception))
        
        # Non-http/https url
        with self.assertRaises(Exception) as context:
            self.contract.create_dispute("0xAccused", "ftp://url.com/a", "https://url.com/b")
        self.assertIn("must start with http:// or https://", str(context.exception))

    def test_join_dispute_success(self):
        # 1. Create dispute
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 50 * 10**18
        did = self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        
        # 2. Join dispute
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 50 * 10**18
        self.contract.join_dispute(did)
        
        self.assertEqual(self.contract.dispute_accused_stake[did], 50 * 10**18)
        self.assertEqual(self.contract.dispute_status[did], "PENDING")

    def test_join_dispute_invalid_id(self):
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 50 * 10**18
        with self.assertRaises(Exception) as context:
            self.contract.join_dispute(99)
        self.assertIn("does not exist", str(context.exception))

    def test_join_dispute_unauthorized(self):
        # 1. Create dispute
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 50 * 10**18
        did = self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        
        # 2. Join from non-accused sender
        mock_genlayer.gl.message.sender_address = "0xThirdParty"
        mock_genlayer.gl.message.value = 50 * 10**18
        with self.assertRaises(Exception) as context:
            self.contract.join_dispute(did)
        self.assertIn("designated accused artist can join", str(context.exception))

    def test_join_dispute_mismatched_stake(self):
        # 1. Create dispute
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 50 * 10**18
        did = self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        
        # 2. Join with wrong stake amount
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 40 * 10**18
        with self.assertRaises(Exception) as context:
            self.contract.join_dispute(did)
        self.assertIn("must lock an identical stake", str(context.exception))

    def test_resolve_dispute_plagiarism_success(self):
        # 1. Create and Join
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 100 * 10**18
        did = self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 100 * 10**18
        self.contract.join_dispute(did)
        
        # 2. Mock AI consensus (70/30 split in favor of original artist)
        leader_out = json.dumps({
            "is_plagiarism": True,
            "original_artist_split": 70,
            "musicological_analysis": "Plagiarism found."
        })
        validator_out = json.dumps({
            "is_plagiarism": True,
            "original_artist_split": 75, # 75% split is within 10% tolerance of 70%
            "musicological_analysis": "Melodic similarities confirmed."
        })
        mock_genlayer.gl.nondet.exec_prompt_responses = [leader_out, validator_out]
        
        # 3. Resolve dispute
        self.contract.resolve_dispute(did)
        
        # 4. Assertions
        self.assertEqual(self.contract.dispute_status[did], "RESOLVED")
        self.assertEqual(self.contract.dispute_is_plagiarism[did], True)
        self.assertEqual(self.contract.dispute_original_split[did], 70) # Uses leader split
        
        # Verify stakes are reset to 0 (reentrancy protection & payout conservation)
        self.assertEqual(self.contract.dispute_original_stake[did], 0)
        self.assertEqual(self.contract.dispute_accused_stake[did], 0)
        
        # Verify payout distribution (total_pool = 200 * 10**18)
        # Original should receive 70% = 140 * 10**18
        # Accused should receive 30% = 60 * 10**18
        transfers = mock_genlayer.gl.mock_transfers
        self.assertEqual(transfers["0xOriginal"], 140 * 10**18)
        self.assertEqual(transfers["0xAccused"], 60 * 10**18)

    def test_resolve_dispute_no_plagiarism_success(self):
        # 1. Create and Join
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 50 * 10**18
        did = self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 50 * 10**18
        self.contract.join_dispute(did)
        
        # 2. Mock AI consensus (0% split - completely independent work)
        leader_out = json.dumps({
            "is_plagiarism": False,
            "original_artist_split": 0,
            "musicological_analysis": "Homage/fair-use. No plagiarism."
        })
        validator_out = json.dumps({
            "is_plagiarism": False,
            "original_artist_split": 5, # within 10% tolerance
            "musicological_analysis": "Independent work."
        })
        mock_genlayer.gl.nondet.exec_prompt_responses = [leader_out, validator_out]
        
        # 3. Resolve
        self.contract.resolve_dispute(did)
        
        # 4. Assertions
        self.assertEqual(self.contract.dispute_status[did], "RESOLVED")
        self.assertEqual(self.contract.dispute_is_plagiarism[did], False)
        self.assertEqual(self.contract.dispute_original_split[did], 0)
        self.assertEqual(self.contract.dispute_original_stake[did], 0)
        self.assertEqual(self.contract.dispute_accused_stake[did], 0)
        
        # Accused receives 100% of the pool = 100 * 10**18
        transfers = mock_genlayer.gl.mock_transfers
        self.assertNotIn("0xOriginal", transfers)
        self.assertEqual(transfers["0xAccused"], 100 * 10**18)

    def test_resolve_dispute_consensus_failure_split_difference(self):
        # 1. Create and Join
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 50 * 10**18
        did = self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 50 * 10**18
        self.contract.join_dispute(did)
        
        # 2. Mock split discrepancy > 10% (80% vs 60%)
        leader_out = json.dumps({
            "is_plagiarism": True,
            "original_artist_split": 80,
            "musicological_analysis": "High plagiarism."
        })
        validator_out = json.dumps({
            "is_plagiarism": True,
            "original_artist_split": 60,
            "musicological_analysis": "Medium plagiarism."
        })
        mock_genlayer.gl.nondet.exec_prompt_responses = [leader_out, validator_out]
        
        # 3. Resolve should raise consensus failure
        with self.assertRaises(RuntimeError) as context:
            self.contract.resolve_dispute(did)
        self.assertIn("Consensus not reached", str(context.exception))

    def test_resolve_dispute_consensus_failure_bool_difference(self):
        # 1. Create and Join
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 50 * 10**18
        did = self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 50 * 10**18
        self.contract.join_dispute(did)
        
        # 2. Mock boolean mismatch (Plagiarism vs Inspiration)
        leader_out = json.dumps({
            "is_plagiarism": True,
            "original_artist_split": 70,
            "musicological_analysis": "Plagiarism found."
        })
        validator_out = json.dumps({
            "is_plagiarism": False,
            "original_artist_split": 70,
            "musicological_analysis": "No plagiarism."
        })
        mock_genlayer.gl.nondet.exec_prompt_responses = [leader_out, validator_out]
        
        # 3. Resolve should raise consensus failure
        with self.assertRaises(RuntimeError) as context:
            self.contract.resolve_dispute(did)
        self.assertIn("Consensus not reached", str(context.exception))

    def test_resolve_dispute_leader_scrape_failure_leads_to_dispute_failure(self):
        # 1. Create and Join
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 50 * 10**18
        # Use '404' to trigger failure in render
        did = self.contract.create_dispute("0xAccused", "https://url.com/404-original", "https://url.com/b")
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 50 * 10**18
        self.contract.join_dispute(did)
        
        # 2. Leader gets scrape failure, so it returns error JSON.
        # Validator also fails when scraping, so they agree on error state.
        self.contract.resolve_dispute(did)
        
        # 3. Check status changes to FAILED
        self.assertEqual(self.contract.dispute_status[did], "FAILED")
        self.assertIn("ORIGINAL_URL_SCRAPE_FAILED", self.contract.dispute_analysis[did])

    def test_resolve_dispute_validator_scrape_failure_rejects_consensus(self):
        # 1. Create and Join
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 50 * 10**18
        did = self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 50 * 10**18
        self.contract.join_dispute(did)
        
        # 2. Mock leader to succeed
        leader_out = json.dumps({
            "is_plagiarism": True,
            "original_artist_split": 70,
            "musicological_analysis": "Plagiarism found."
        })
        mock_genlayer.gl.nondet.exec_prompt_responses = [leader_out]
        
        # 3. Enable validator-only scrape failure
        mock_genlayer.gl.vm.fail_validator_render = True
        
        # 4. Resolve should fail to reach consensus because validator got error but leader did not.
        with self.assertRaises(RuntimeError) as context:
            self.contract.resolve_dispute(did)
        self.assertIn("Consensus not reached", str(context.exception))

    def test_resolve_dispute_validator_llm_failure_rejects_consensus(self):
        # 1. Create and Join
        mock_genlayer.gl.message.sender_address = "0xOriginal"
        mock_genlayer.gl.message.value = 50 * 10**18
        did = self.contract.create_dispute("0xAccused", "https://url.com/a", "https://url.com/b")
        mock_genlayer.gl.message.sender_address = "0xAccused"
        mock_genlayer.gl.message.value = 50 * 10**18
        self.contract.join_dispute(did)
        
        # 2. Mock leader to succeed
        leader_out = json.dumps({
            "is_plagiarism": True,
            "original_artist_split": 70,
            "musicological_analysis": "Plagiarism found."
        })
        mock_genlayer.gl.nondet.exec_prompt_responses = [leader_out]
        
        # 3. Enable validator-only LLM failure
        mock_genlayer.gl.vm.fail_validator_llm = True
        
        # 4. Resolve should fail to reach consensus
        with self.assertRaises(RuntimeError) as context:
            self.contract.resolve_dispute(did)
        self.assertIn("Consensus not reached", str(context.exception))

if __name__ == '__main__':
    unittest.main()
