import LoginBase from './LoginBase';

const LoginDean = () => (
  <LoginBase
    badge="🎓"
    title="Dean Login"
    subtitle="Sign in to your college administration portal"
    registerPath="/auth/dean/register"
  />
);

export default LoginDean;
