import GpxVisualizer from "../islands/GpxVisualizer.tsx";

export default function Home() {
  return (
    <div class="px-4 py-8 mx-auto bg-white">
      <div class="max-w-screen-xl mx-auto flex flex-col items-center justify-center">
        <div class="w-full mb-10 text-center">
          <h1 class="text-4xl font-bold mb-2">Ultra Race Planner</h1>
          <p class="text-gray-600">
            Visualizza l'altitudine delle tue tracce GPX per pianificare le tue avventure
          </p>
        </div>
        
        <div class="w-full">
          <GpxVisualizer />
        </div>
      </div>
    </div>
  );
}
