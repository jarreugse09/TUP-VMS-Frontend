import LoginBase from './LoginBase';

const LoginSecurity = () => (
  <LoginBase
    badge="🛡️"
    title="Security Login"
    subtitle="Sign in to the campus security portal"
    registerPath="/auth/security/register"
  />
);

export default LoginSecurity;
