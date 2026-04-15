import LoginBase from './LoginBase';

const LoginStudentVisitor = () => (
  <LoginBase
    badge="🎓"
    title="Student / Visitor Login"
    subtitle="Sign in to your TUP VMS personal portal"
    registerPath="/auth/student/register"
  />
);

export default LoginStudentVisitor;
