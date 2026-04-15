import LoginBase from './LoginBase';

const LoginSuperadmin = () => (
  <LoginBase
    badge="🔐"
    title="Superadmin Login"
    subtitle="Sign in to the system administration portal"
    registerPath="/auth/superadmin/register"
  />
);

export default LoginSuperadmin;
