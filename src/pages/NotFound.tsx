
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8 rounded-lg shadow-lg bg-white">
        <div className="flex justify-center mb-6">
          <FileQuestion className="h-24 w-24 text-blue-500" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-gray-800">404</h1>
        <p className="text-xl text-gray-600 mb-6">
          Oops! We couldn't find the page you're looking for.
        </p>
        <div className="space-y-4">
          <Link to="/">
            <Button className="w-full">Return to Dashboard</Button>
          </Link>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
