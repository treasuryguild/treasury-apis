import type { NextPage } from "next";
import { useMyVariable } from '../context/MyVariableContext';




const Other: NextPage = () => {
  const { myVariable, setMyVariable } = useMyVariable();

  return (
    <div>
      <div>
        Other
      </div>
    </div>
  );
};

export default Other;
