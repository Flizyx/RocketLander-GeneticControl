// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the simulation
    const simulation = new RocketSimulation();
    
    // Draw initial setup
    simulation.drawSetup();
    
    // Log that the simulation is ready
    console.log('Rocket Landing Simulation initialized');
  });