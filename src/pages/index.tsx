import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { useMyVariable } from '../context/MyVariableContext';
import OrgCard from '../components/OrgCard';
import styles from '../styles/OrgCard.module.css';
import { getIssues } from '../utils/getIssues';

const Home: NextPage = () => {
  const { myVariable, setMyVariable } = useMyVariable();

  async function testIssues() {
    const issues = await getIssues();
    console.log("issues", issues)
  }

  useEffect(() => {
    testIssues();
  }, []);

  return (
    <div>
      <div className={styles.orgscontainer}>
      {myVariable.orgInfo.map((org: any) => (
        <OrgCard 
          key={org.org_id} 
          orgName={org.org_name} 
          logoUrl={org.logo_url} 
          numberOfRepos={org.repos.length} 
        />
      ))}
      </div>
    </div>
  );
};

export default Home;