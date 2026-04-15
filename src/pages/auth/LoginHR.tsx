import LoginBase from './LoginBase';

const LoginHR = () => (
  <LoginBase
    badge="👤"
    title="HR Login"
    subtitle="Sign in to the human resources portal"
    registerPath="/auth/hr/register"
  />
);

export default LoginHR;
