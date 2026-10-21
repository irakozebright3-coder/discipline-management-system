import { Link } from 'react-router-dom';

export default function PageNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Link to="/" className="text-primary underline-offset-4 hover:underline">Back to home</Link>
    </div>
  );
}
