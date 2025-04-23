import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 flex items-center justify-center text-center px-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Welcome to Rishi-AI ✨
        </h1>
      </main>
      <Footer />
    </div>
  );
};

export default Index;