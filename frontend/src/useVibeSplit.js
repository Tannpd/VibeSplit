import { useState, useCallback, useEffect } from 'react';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

let _readClient = null;

function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: studionet });
  }
  return _readClient;
}

function getWriteClient(account) {
  return createClient({ chain: studionet, account });
}

// Convert Wei (u256) to human readable GEN string
export function formatGen(weiVal) {
  if (!weiVal) return '0';
  try {
    const big = BigInt(weiVal);
    const integerPart = big / 10n**18n;
    const fractionalPart = big % 10n**18n;
    let fractionStr = fractionalPart.toString().padStart(18, '0');
    fractionStr = fractionStr.replace(/0+$/, ''); // Trim trailing zeros
    if (fractionStr === '') {
      return integerPart.toString();
    }
    return `${integerPart}.${fractionStr.slice(0, 4)}`;
  } catch (e) {
    return '0';
  }
}

// Convert human readable GEN input to Wei (u256 BigInt)
export function parseGen(genVal) {
  if (!genVal || genVal.toString().trim() === '') return 0n;
  try {
    const parts = genVal.toString().split('.');
    let integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';
    fractionalPart = fractionalPart.slice(0, 18).padEnd(18, '0');
    return BigInt(integerPart) * 10n**18n + BigInt(fractionalPart);
  } catch (e) {
    return 0n;
  }
}

export function useVibeSplit() {
  const [address, setAddress] = useState('');
  const [glAccount, setGlAccount] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [contractBalance, setContractBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Connect Wallet (MetaMask/ethereum provider or fallback ephemeral account)
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const addr = accounts[0].toLowerCase();
        setAddress(addr);
        setGlAccount(addr);
      } else {
        // Ephemeral account fallback
        let savedKey = localStorage.getItem('__vibesplit_sk');
        let acct;
        if (savedKey) {
          acct = createAccount(savedKey);
        } else {
          acct = createAccount();
          localStorage.setItem('__vibesplit_sk', acct.privateKey);
        }
        const addr = acct.address.toLowerCase();
        setAddress(addr);
        setGlAccount(acct);
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError('Wallet connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all disputes and contract balance
  const fetchDisputesState = useCallback(async () => {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    setLoading(true);
    try {
      const client = getReadClient();
      
      // Get disputes count
      const rawCount = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_disputes_count',
        args: [],
      });
      const count = Number(rawCount);
      
      const fetchedDisputes = [];
      for (let i = 0; i < count; i++) {
        const rawDispute = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_dispute',
          args: [i],
        });
        if (rawDispute && rawDispute !== '{}') {
          const disputeObj = JSON.parse(rawDispute);
          fetchedDisputes.push(disputeObj);
        }
      }
      
      // Get balance of contract (escrow pool balance)
      const rawBalance = await client.getBalance({ address: CONTRACT_ADDRESS });
      setContractBalance(rawBalance.toString());
      
      setDisputes(fetchedDisputes.reverse()); // Show newest first
      setError('');
    } catch (err) {
      console.error('Error fetching disputes:', err);
      setError('Failed to fetch disputes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Dispute (Lock GEN, set accused, set URLs)
  const createDispute = async (accusedAddress, originalUrl, accusedUrl, stakeAmt) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Opening dispute. Staking ${stakeAmt} GEN...`);

    try {
      const client = getWriteClient(glAccount);
      const valueWei = parseGen(stakeAmt);
      
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'create_dispute',
        args: [accusedAddress.trim(), originalUrl.trim(), accusedUrl.trim()],
        value: valueWei,
      });
      
      setTxHash(hash);
      setTxStatus('Submitting dispute transaction. Locking royalties stake...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Contract execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Dispute opened.');
      await fetchDisputesState();
      return receipt;
    } catch (err) {
      console.error('Create dispute failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Join Dispute (Lock accused matching stake)
  const joinDispute = async (disputeId, stakeAmt) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Joining dispute #${disputeId}. Locking matching stake of ${stakeAmt} GEN...`);

    try {
      const client = getWriteClient(glAccount);
      const valueWei = parseGen(stakeAmt);
      
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'join_dispute',
        args: [Number(disputeId)],
        value: valueWei,
      });
      
      setTxHash(hash);
      setTxStatus('Submitting match-stake transaction...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Contract execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Joined dispute. Ready for arbitration.');
      await fetchDisputesState();
      return receipt;
    } catch (err) {
      console.error('Join dispute failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Resolve Dispute (AI Musicologist arbitration & payout)
  const resolveDispute = async (disputeId) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Invoking AI Musicologist consensus arbitration on dispute #${disputeId}...`);

    try {
      const client = getWriteClient(glAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'resolve_dispute',
        args: [Number(disputeId)],
      });
      
      setTxHash(hash);
      setTxStatus('AI Musicologists are comparing track progressions, lyrics, and melodies. Please wait 15-30s...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Arbitration execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Consensus complete! Staked funds distributed according to proportion.');
      await fetchDisputesState();
      return receipt;
    } catch (err) {
      console.error('Resolve dispute failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      fetchDisputesState();
    }
  }, [CONTRACT_ADDRESS, address, fetchDisputesState]);

  return {
    address,
    disputes,
    contractBalance,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    fetchDisputesState,
    createDispute,
    joinDispute,
    resolveDispute,
    contractAddress: CONTRACT_ADDRESS,
  };
}
