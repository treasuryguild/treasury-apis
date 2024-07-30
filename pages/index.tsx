// Updated components/Home.tsx
import { NextPage } from "next";
import { useState, useEffect } from "react";
import { useMyVariable } from '../context/MyVariableContext';
import styles from '../styles/OrgCard.module.css';
import TestDataButton from '../components/TestDataButton';
import SnetWorkspacesTestButton from '../components/SnetWorkspacesTestButton';
import SwarmWorkspacesTestButton from '../components/SwarmWorkspacesTestButton';
import WalletDataTestButton from '../components/WalletDataTestButton';
import ExcelDataFetcher from '../utils/ExcelDataFetcher';

const SHOW_TEST_BUTTON = process.env.NEXT_PUBLIC_SHOW_TEST_BUTTON === 'true';

const Home: NextPage = () => {
  const { myVariable, setMyVariable } = useMyVariable();
  const [testData, setTestData] = useState({
    id: 123,
    value: 'Test data'
  });

  useEffect(() => {
    // Uncomment the desired function calls
    // ExcelDataFetcher.fetchExcelData();
  }, []);

  return (
    <div>
      <div className={styles.orgscontainer}>
        test
        {SHOW_TEST_BUTTON && (
            <>
              <TestDataButton testData={testData} />
              <SnetWorkspacesTestButton />
              <SwarmWorkspacesTestButton />
              <WalletDataTestButton />
            </>
          )
        }
      </div>
    </div>
  );
};

export default Home;