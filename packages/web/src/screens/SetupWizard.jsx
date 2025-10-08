import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/core/Button';
import Input from '../components/core/Input';
import Select from '../components/core/Select';
import { useAuth } from '@shared/hooks/useAuth';
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore"; // Import serverTimestamp
import api from '@shared/api/firebase';
import TransactionModal from '../components/modals/TransactionModal';
import { formatCurrency } from '@shared/utils/currency';
import CurrencyInput from '../components/core/CurrencyInput';

// ... (Other helper components are unchanged)
const SetupMethodSelection = ({ onSelect }) => {
  const handleSelect = (method) => {
    onSelect(method);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center">
        How would you like to set up your account?
      </h2>
      <div className="mt-8 space-y-4">
        <Button
          onClick={() => handleSelect('plaid')}
          className="w-full"
          variant="primary"
        >
          Connect with Plaid (Recommended)
        </Button>
        <Button
          onClick={() => handleSelect('manual')}
          className="w-full"
          variant="secondary"
        >
          Add Accounts Manually
        </Button>
      </div>
    </div>
  );
};

const ManualAccountSetup = ({ onNext, onUpdateAccounts, accounts }) => {
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('Checking');
  const [balance, setBalance] = useState('');
  const [cushion, setCushion] = useState('');

  const handleAddAccount = () => {
    if (!accountName || !balance) {
        alert('Please fill out at least Account Name and Current Balance.');
        return;
    }
    const newAccount = {
      id: `temp-${Date.now()}`,
      name: accountName,
      type: accountType,
      startingBalance: parseFloat(balance),
      cushion: cushion ? parseFloat(cushion) : 0,
    };
    onUpdateAccounts(newAccount);
    setAccountName('');
    setAccountType('Checking');
    setBalance('');
    setCushion('');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center">Add Your Accounts</h2>
      <div className="mt-8 space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700">Account Name</label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Chase Checking"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Account Type</label>
            <Select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
            >
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
            </Select>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Current Balance</label>
            <CurrencyInput
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Balance Cushion (Optional)</label>
            <CurrencyInput
              value={cushion}
              onChange={(e) => setCushion(e.target.value)}
            />
        </div>
        <Button onClick={handleAddAccount} className="w-full !mt-6">
          Add Account
        </Button>

        {accounts.length > 0 && (
            <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold text-center text-gray-600">Your Accounts</h3>
                <ul className="mt-2 space-y-2">
                    {accounts.map(acc => (
                        <li key={acc.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                            <span>{acc.name} ({acc.type})</span>
                            <span className="font-medium">{formatCurrency(acc.startingBalance)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}

        <Button onClick={onNext} variant="primary" className="w-full mt-4" disabled={accounts.length === 0}>
          Next
        </Button>
      </div>
    </div>
  );
};

const RecurringTransactionsSetup = ({ onFinish, onUpdateTransactions, transactions }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-center">
        Add Recurring Transactions
      </h2>
      <p className="mt-2 text-center text-gray-600">
        Add your regular income and bills (e.g., Paycheck, Rent, Netflix).
      </p>
      <div className="mt-8 space-y-4">
        <Button onClick={onUpdateTransactions} className="w-full">
          Add Recurring Transaction
        </Button>
        
        {transactions.length > 0 && (
            <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold text-center text-gray-600">Your Recurring Transactions</h3>
                <ul className="mt-2 space-y-2">
                    {transactions.map((t, i) => (
                        <li key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                            <span>{t.description} ({t.recurringDetails.frequency})</span>
                            <span className={`font-medium ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(t.amount)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}

        <div className="flex space-x-4 !mt-6">
            <Button onClick={onFinish} variant="secondary" className="w-full">
                Skip & Finish
            </Button>
            <Button onClick={onFinish} variant="primary" className="w-full">
                Finish Setup
            </Button>
        </div>
      </div>
    </div>
  );
};

const PlaidSetup = ({ onNext }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-center">
        Connect Your Bank with Plaid
      </h2>
      <div className="mt-8">
        <p className="text-center">
          Plaid integration is not yet implemented.
        </p>
        <Button onClick={onNext} variant="primary" className="w-full mt-4">
          Pretend I've Connected
        </Button>
      </div>
    </div>
  );
};

const SetupWizard = () => {
  const [step, setStep] = useState(1);
  const [setupMethod, setSetupMethod] = useState(null);
  const [manualAccounts, setManualAccounts] = useState([]);
  const [manualTransactions, setManualTransactions] = useState([]);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNextStep = () => setStep((prevStep) => prevStep + 1);
  const handlePrevStep = () => setStep((prevStep) => prevStep - 1);

  const updateAccounts = (newAccount) => {
    setManualAccounts((prevAccounts) => [...prevAccounts, newAccount]);
  };

  const updateTransactions = (newTransaction) => {
    setManualTransactions((prevTransactions) => [
      ...prevTransactions,
      {
        ...newTransaction,
        isRecurring: true,
        amount: newTransaction.type === 'expense' ? -Math.abs(newTransaction.amount) : Math.abs(newTransaction.amount),
        recurringDetails: {
          frequency: newTransaction.frequency,
          nextDate: newTransaction.date,
        },
      },
    ]);
    setIsTransactionModalOpen(false);
  };

  const handleFinishSetup = async () => {
    try {
        if (!user || !user.uid) {
            throw new Error("User is not authenticated.");
        }

        const batch = writeBatch(api.firestore);
        const accountsCollection = collection(api.firestore, `users/${user.uid}/accounts`);
        const transactionsCollection = collection(api.firestore, `users/${user.uid}/transactions`);

        const tempIdToNewIdMap = new Map();

        manualAccounts.forEach(account => {
            const { id: tempId, ...accData } = account;
            const newAccountRef = doc(accountsCollection);
            batch.set(newAccountRef, accData);
            tempIdToNewIdMap.set(tempId, newAccountRef.id);
        });

        manualTransactions.forEach(transaction => {
            const newTransactionRef = doc(transactionsCollection);
            const tempAccountId = transaction.accountId;
            const newAccountId = tempIdToNewIdMap.get(tempAccountId);

            if (newAccountId) {
                transaction.accountId = newAccountId;
            } else {
                console.warn(`Could not find new account ID for temp ID: ${tempAccountId}`);
            }
            
            // --- THIS IS THE FIX ---
            // Add the createdAt timestamp to every transaction from the wizard
            const finalTransaction = {
                ...transaction,
                createdAt: serverTimestamp()
            };
            batch.set(newTransactionRef, finalTransaction);
        });

        await batch.commit();
        
        navigate('/app/dashboard');

    } catch (error) {
        console.error("Error finishing setup: ", error);
        alert(`There was an error saving your setup: ${error.message}`);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <SetupMethodSelection
            onSelect={(method) => {
              setSetupMethod(method);
              handleNextStep();
            }}
          />
        );
      case 2:
        if (setupMethod === 'plaid') {
          return <PlaidSetup onNext={handleNextStep} />;
        }
        return (
          <ManualAccountSetup
            onNext={handleNextStep}
            onUpdateAccounts={updateAccounts}
            accounts={manualAccounts}
          />
        );
      case 3:
        return (
          <RecurringTransactionsSetup
            onFinish={handleFinishSetup}
            onUpdateTransactions={() => setIsTransactionModalOpen(true)}
            transactions={manualTransactions}
          />
        );
      default:
        setStep(1);
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-start h-8">
          {step > 1 && (
            <Button onClick={handlePrevStep} variant="link">
              Back
            </Button>
          )}
        </div>
        {renderStep()}
        {isTransactionModalOpen && (
             <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSubmit={updateTransactions}
                isRecurringSetup={true}
                accounts={manualAccounts}
            />
        )}
      </div>
    </div>
  );
};

export default SetupWizard;