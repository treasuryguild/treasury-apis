// Updated components/Home.tsx
import { NextPage } from "next";
import { useState, useEffect } from "react";
import { useMyVariable } from '../context/MyVariableContext';
import styles from '../styles/OrgCard.module.css';
import TestDataButton from '../components/TestDataButton';
import SnetWorkspacesTestButton from '../components/SnetWorkspacesTestButton';
import SwarmWorkspacesTestButton from '../components/SwarmWorkspacesTestButton';
import WalletDataTestButton from '../components/WalletDataTestButton';
import TransactionIdTestButton from '../components/TransactionIdTestButton';
import ExcelDataFetcher from '../utils/ExcelDataFetcher';

const SHOW_TEST_BUTTON = process.env.NEXT_PUBLIC_SHOW_TEST_BUTTON === 'true';

// Define types for our test data
interface TokenRegistry {
  assetName: string;
  tokenTicker: string;
  multiplier: string;
  policyId: string;
  exhangeRateNeeded: string;
}

interface TokenFee {
  groupName: string;
  tokenTicker: string;
  fee: string;
  walletAddress: string;
  walletName: string;
}

interface Task {
  recognitionId: string;
  groupName: string;
  subGroup: string;
  taskLabels: string;
  taskName: string;
  walletAddress: string;
  proofLink: string;
  date: string;
  tokenT: Array<{
    [key: string]: string;
  }>;
}

interface TestData {
  tokenRegistry: TokenRegistry[];
  tokenFee: TokenFee[];
  tasks: Task[];
}

const Home: NextPage = () => {
  const { myVariable, setMyVariable } = useMyVariable();
  const [testData, setTestData] = useState<TestData | null>(null);

  useEffect(() => {
    // Fetch the JSON data
    fetch('/testData.json')
      .then(response => response.json())
      .then(data => setTestData(data))
      .catch(error => console.error('Error loading test data:', error));

    // Uncomment the desired function calls
    // ExcelDataFetcher.fetchExcelData();
  }, []);

  return (
    <div>
      <div className={styles.orgscontainer}>
        test
        {SHOW_TEST_BUTTON && testData && (
          <>
            <TestDataButton testData={testData} />
            <TransactionIdTestButton />
            <SnetWorkspacesTestButton />
            <SwarmWorkspacesTestButton />
            <WalletDataTestButton />
          </>
        )}
      </div>
    </div>
  );
};

export default Home;