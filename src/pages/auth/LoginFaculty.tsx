import LoginBase from './LoginBase';

const LoginFaculty = () => (
  <LoginBase
    badge="🧑‍🏫"
    title="Faculty Login"
    subtitle="Sign in to the faculty access portal"
    registerPath="/auth/faculty/register"
  />
);

export default LoginFaculty;
