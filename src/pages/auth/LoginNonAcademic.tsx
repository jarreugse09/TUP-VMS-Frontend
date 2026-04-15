import LoginBase from './LoginBase';

const LoginNonAcademic = () => (
  <LoginBase
    badge="🏫"
    title="Non-Academic Login"
    subtitle="Sign in to the non-academic staff portal"
    registerPath="/auth/non-academic/register"
  />
);

export default LoginNonAcademic;
