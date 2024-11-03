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
import QueryTester from '../components/QueryTester';



const Home: NextPage = () => {

  return (
    <div>
      <div className={styles.orgscontainer}>
        Home
      </div>
    </div>
  );
};

export default Home;