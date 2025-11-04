import { useAuth } from "../../contexts/AuthContext";

function Home() {
  const { login } = useAuth();
  return (
    <div>
      <h1>Login required</h1>
      <button
        onClick={login}
        style={{ cursor: "pointer", border: "1px solid black" }}
      >
        Login with CAS
      </button>
    </div>
  );
}

export default Home;
