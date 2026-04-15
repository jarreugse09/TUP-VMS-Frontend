import LoginBase from './LoginBase';

const LoginDepartmentHead = () => (
  <LoginBase
    badge="🏛️"
    title="Department Head Login"
    subtitle="Sign in to your department leadership portal"
    registerPath="/auth/department-head/register"
  />
);

export default LoginDepartmentHead;
