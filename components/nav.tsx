import Link from 'next/link';
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';

const Nav = () => {
  const router = useRouter();
  const { groupName, projectName, txid } = router.query;  
   //console.log(session, isAdmin)
  return (
    <nav className="routes">
          <Link href="/" className="navitems">
            Home
          </Link>
          <Link href="/other" className="navitems">
            Other
          </Link>
    </nav>
  );
};

export default Nav;