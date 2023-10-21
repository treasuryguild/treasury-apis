import "../styles/globals.css";
import type { AppProps } from "next/app";
import Nav from '../components/nav'
import { MyVariableProvider } from '../context/MyVariableContext';  
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { groupName, projectName, txid } = router.query;
  return (
    <MyVariableProvider>  
        <div className="main">
          <div className="nav">
            <div>
              <Nav />
            </div>
            <div>
              {projectName && (
              <h2 className="page">{projectName}</h2>)}
              {!projectName && (
              <h2 className="page">{groupName}</h2>)}
            </div>
          </div>
          <div className="component">
            <Component {...pageProps} />
          </div>
        </div>
    </MyVariableProvider>  
  );
}

export default MyApp;
