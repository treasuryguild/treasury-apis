// GroupCard.tsx
import React from 'react';
import styles from '../styles/OrgCard.module.css';  // Import the module CSS
import Link from 'next/link';

type OrgCardProps = {
  orgName: string;
  logoUrl: string;
  numberOfRepos: number;
};

const GroupCard: React.FC<OrgCardProps> = ({ orgName, logoUrl, numberOfRepos }) => {
    // Default logo URL
    const defaultLogoUrl = "";//process.env.NEXT_PUBLIC_DEFAULT_LOGO;
  
    return (
        <Link href={`/${encodeURIComponent(orgName)}`} className={styles['org-card']}>
                <div className={styles['org-card-content']}>
                    <img
                        src={logoUrl || defaultLogoUrl}
                        alt={`${orgName} logo`} 
                        className={styles['org-logo']} 
                    />
                    <h4>{orgName}</h4>
                </div>
        </Link>
    );
};

export default GroupCard;
