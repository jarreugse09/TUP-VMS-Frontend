import LoginBase from './LoginBase';

const LoginTopManagement = () => (
  <LoginBase
    badge="🏢"
    title="Top Management Login"
    subtitle="Sign in to the executive VMS portal"
    registerPath="/auth/top-management/register"
  />
);

export default LoginTopManagement;
