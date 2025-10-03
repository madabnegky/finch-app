import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/core/Button';
import Input from '../components/core/Input';
import Select from '../components/core/Select';
import { useAuth } from '@shared/hooks/useAuth';
// FIX: Changed to a default import to match the updated export
import api from '@shared/api/firebase';
import TransactionModal from '../components/modals/TransactionModal';

// Helper component for Step 1
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

// Helper component for Manual Account step
const ManualAccountSetup = ({ onNext, onUpdateAccounts }) => {
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [balance, setBalance] = useState('');
  const [cushion, setCushion] = useState('');

  const handleAddAccount = () => {
    if (!accountName || !balance) {
        alert('Please fill out at least Account Name and Current Balance.');
        return;
    }
    const newAccount = {
      name: accountName,
      type: accountType,
      balance: parseFloat(balance),
      cushion: cushion ? parseFloat(cushion) : 0,
    };
    onUpdateAccounts(newAccount);
    setAccountName('');
    setAccountType('checking');
    setBalance('');
    setCushion('');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center">Add Your Accounts</h2>
      <div className="mt-8 space-y-4">
        <Input
          label="Account Name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="e.g., Chase Checking"
        />
        <Select
          label="Account Type"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          options={[
            { value: 'checking', label: 'Checking' },
            { value: 'savings', label: 'Savings' },
            { value: 'credit_card', label: 'Credit Card' },
          ]}
        />
        <Input
          label="Current Balance"
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="e.g., 1500.00"
        />
        <Input
          label="Balance Cushion (Optional)"
          type="number"
          value={cushion}
          onChange={(e) => setCushion(e.target.value)}
          placeholder="e.g., 200.00"
        />
        <Button onClick={handleAddAccount} className="w-full">
          Add Another Account
        </Button>
        <Button onClick={onNext} variant="primary" className="w-full mt-4">
          Next
        </Button>
      </div>
    </div>
  );
};

// Helper component for Recurring Transactions step
const RecurringTransactionsSetup = ({ onFinish, onUpdateTransactions }) => {
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
        <Button onClick={onFinish} variant="primary" className="w-full mt-4">
          Finish Setup
        </Button>
      </div>
    </div>
  );
};

// Helper component for Plaid step
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

// Main SetupWizard component
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
      newTransaction,
    ]);
    setIsTransactionModalOpen(false);
  };

  const handleFinishSetup = async () => {
    try {
      if (!user || !user.uid) {
        throw new Error("User is not authenticated.");
      }
      
      const accountPromises = manualAccounts.map((account) =>
        api.firestore.collection(`users/${user.uid}/accounts`).add(account)
      );
      
      const transactionPromises = manualTransactions.map((transaction) =>
        api.firestore.collection(`users/${user.uid}/transactions`).add(transaction)
      );
      
      await Promise.all([...accountPromises, ...transactionPromises]);
      
      navigate('/dashboard');

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
          />
        );
      case 3:
        return (
          <RecurringTransactionsSetup
            onFinish={handleFinishSetup}
            onUpdateTransactions={() => setIsTransactionModalOpen(true)}
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
                onSave={updateTransactions}
                isRecurring={true}
            />
        )}
      </div>
    </div>
  );
};

export default SetupWizard;