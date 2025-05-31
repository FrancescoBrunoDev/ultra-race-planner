import GpxVisualizer from "../islands/GpxVisualizer.tsx";
import Navbar from "../islands/NavBar.tsx";

export default function Home() {
  return (
    <div class="px-4 py-8 mx-auto bg-white">
      <div class="max-w-screen-xl mx-auto flex flex-col items-center justify-center">
        <Navbar />

        <div class="w-full">
          <GpxVisualizer />
        </div>
      </div>
    </div>
  );
}
