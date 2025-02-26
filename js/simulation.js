class RocketSimulation {
    constructor() {
      // Constants
      this.GRAVITY = 0.03;
      this.WIND_SCALE = 0.1;
      this.GENE_FACTOR = 0.2;
      this.POP_SIZE = 25;
      
      // Canvas setup
      this.canvas = document.getElementById('canvas');
      this.ctx = this.canvas.getContext('2d');
      
      // Simulation state
      this.running = false;
      this.paused = false;
      this.population = [];
      this.generation = 0;
      this.lifeCounter = 0;
      this.bestRocketEver = null;
      
      // Counters for events
      this.countLanded = 0;
      this.countCrashed = 0;
      this.countTimeout = 0;
      
      // Parameters (will be set from UI)
      this.landingX = 300;
      this.obstacleX = 150;
      this.obstacleSize = 50;
      this.windForce = 0;
      this.simSpeed = 1;
      this.lifetime = 300;
      
      // UI elements
      this.initUIElements();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initial setup
      this.drawSetup();
    }
    
    initUIElements() {
      // Sliders and value displays
      this.landingXSlider = document.getElementById('landingX');
      this.obstacleXSlider = document.getElementById('obstacleX');
      this.obstacleSizeSlider = document.getElementById('obstacleSize');
      this.windSlider = document.getElementById('wind');
      this.simSpeedSlider = document.getElementById('simSpeed');
      this.genTimeSlider = document.getElementById('genTime');
      
      this.landingXVal = document.getElementById('landingXVal');
      this.obstacleXVal = document.getElementById('obstacleXVal');
      this.obstacleSizeVal = document.getElementById('obstacleSizeVal');
      this.windVal = document.getElementById('windVal');
      this.simSpeedVal = document.getElementById('simSpeedVal');
      this.genTimeVal = document.getElementById('genTimeVal');
      
      // Status displays
      this.generationSpan = document.getElementById('generation');
      this.bestErrorSpan = document.getElementById('bestError');
      this.landedCountSpan = document.getElementById('landedCount');
      this.crashedCountSpan = document.getElementById('crashedCount');
      this.timeoutCountSpan = document.getElementById('timeoutCount');
      this.totalCountSpan = document.getElementById('totalCount');
      this.statusText = document.getElementById('statusText');
      this.pauseBtn = document.getElementById('pauseBtn');
    }
    
    setupEventListeners() {
      // Button click handlers
      document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
      document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
      document.getElementById('resetBtn').addEventListener('click', () => this.resetSimulation());
      document.getElementById('forceEndBtn').addEventListener('click', () => this.forceEndGeneration());
      document.getElementById('replayBtn').addEventListener('click', () => this.replayBest());
      
      // Slider change handlers
      this.landingXSlider.addEventListener("input", () => {
        this.landingXVal.innerText = this.landingXSlider.value;
        if (!this.running) { this.landingX = parseInt(this.landingXSlider.value); this.drawSetup(); }
      });
      
      this.obstacleXSlider.addEventListener("input", () => {
        this.obstacleXVal.innerText = this.obstacleXSlider.value;
        if (!this.running) { this.obstacleX = parseInt(this.obstacleXSlider.value); this.drawSetup(); }
      });
      
      this.obstacleSizeSlider.addEventListener("input", () => {
        this.obstacleSizeVal.innerText = this.obstacleSizeSlider.value;
        if (!this.running) { this.obstacleSize = parseInt(this.obstacleSizeSlider.value); this.drawSetup(); }
      });
      
      this.windSlider.addEventListener("input", () => {
        this.windVal.innerText = this.windSlider.value;
        this.windForce = parseFloat(this.windSlider.value);
      });
      
      this.simSpeedSlider.addEventListener("input", () => {
        this.simSpeedVal.innerText = this.simSpeedSlider.value;
        this.simSpeed = parseFloat(this.simSpeedSlider.value);
      });
      
      this.genTimeSlider.addEventListener("input", () => {
        this.genTimeVal.innerText = this.genTimeSlider.value;
        this.lifetime = parseInt(this.genTimeSlider.value);
      });
    }
  
    // Initialize rocket population
    initPopulation() {
      this.population = [];
      
      const config = {
        canvas: this.canvas,
        landingX: this.landingX,
        obstacleX: this.obstacleX,
        obstacleSize: this.obstacleSize,
        windForce: this.windForce,
        GENE_FACTOR: this.GENE_FACTOR,
        WIND_SCALE: this.WIND_SCALE,
        GRAVITY: this.GRAVITY,
        lifetime: this.lifetime
      };
      
      for (let i = 0; i < this.POP_SIZE; i++) {
        this.population.push(new Rocket(null, config));
      }
      
      this.lifeCounter = 0;
      this.countLanded = 0;
      this.countCrashed = 0;
      this.countTimeout = 0;
      this.totalCountSpan.innerText = this.POP_SIZE;
    }
  
    // Clone a rocket (used for best rocket replay)
    cloneRocket(rocket) {
      return {
        dna: rocket.dna.slice(),
        fitness: rocket.fitness,
        trajectory: rocket.trajectory.slice()
      };
    }
  
    // Evaluate population and update stats
    evaluatePopulation() {
      let maxFitness = 0;
      this.countLanded = 0;
      this.countCrashed = 0;
      this.countTimeout = 0;
      
      this.population.forEach(rocket => {
        if (!rocket.completed && !rocket.crashed) {
          rocket.timedOut = true;
        }
        rocket.calcFitness();
        if (rocket.fitness > maxFitness) maxFitness = rocket.fitness;
        if (rocket.completed) this.countLanded++;
        if (rocket.crashed) this.countCrashed++;
        if (rocket.timedOut) this.countTimeout++;
      });
      
      this.landedCountSpan.innerText = this.countLanded;
      this.crashedCountSpan.innerText = this.countCrashed;
      this.timeoutCountSpan.innerText = this.countTimeout;
      
      // Best error represented as inverse of fitness
      this.bestErrorSpan.innerText = (1 / maxFitness).toFixed(2);
      this.totalCountSpan.innerText = this.POP_SIZE;
      
      return maxFitness;
    }
  
    // Selection process for genetic algorithm
    selection() {
      this.population.sort((a, b) => b.fitness - a.fitness);
      
      if (!this.bestRocketEver || this.population[0].fitness > this.bestRocketEver.fitness) {
        this.bestRocketEver = this.cloneRocket(this.population[0]);
      }
      
      const parents = this.population.slice(0, this.POP_SIZE / 2);
      let newPopulation = [];
      
      const config = {
        canvas: this.canvas,
        landingX: this.landingX,
        obstacleX: this.obstacleX,
        obstacleSize: this.obstacleSize,
        windForce: this.windForce,
        GENE_FACTOR: this.GENE_FACTOR,
        WIND_SCALE: this.WIND_SCALE,
        GRAVITY: this.GRAVITY,
        lifetime: this.lifetime
      };
      
      for (let i = 0; i < this.POP_SIZE; i++) {
        const parent = parents[i % parents.length];
        let childDNA = [];
        
        for (let j = 0; j < this.lifetime; j++) {
          let gene = parent.dna[j];
          if (Math.random() < 0.01) {
            gene = {
              x: (Math.random() * 2 - 1) * this.GENE_FACTOR,
              y: (Math.random() * 2 - 1) * this.GENE_FACTOR
            };
          }
          childDNA.push(gene);
        }
        
        newPopulation.push(new Rocket(childDNA, config));
      }
      
      this.population = newPopulation;
    }
  
    // Check if generation is over
    isGenerationOver() {
      return this.population.every(r => r.completed || r.crashed || r.timedOut);
    }
  
    // Force end the current generation
    forceEndGeneration() {
      if (!this.running) return;
      
      this.population.forEach(r => {
        if (!r.completed && !r.crashed) r.timedOut = true;
      });
      
      this.nextGeneration();
    }
  
    // Start next generation
    nextGeneration() {
      this.evaluatePopulation();
      this.selection();
      this.generation++;
      this.generationSpan.innerText = this.generation;
      this.lifeCounter = 0;
      this.statusText.innerText = `Simulating generation ${this.generation}...`;
      this.drawSetup();
    }
  
    // Update simulation state
    update() {
      if (this.paused) return;
      
      let steps = Math.round(this.simSpeed);
      for (let i = 0; i < steps; i++) {
        this.population.forEach(r => {
          // Update rocket config with current settings
          r.landingX = this.landingX;
          r.obstacleX = this.obstacleX;
          r.obstacleSize = this.obstacleSize;
          r.windForce = this.windForce;
          
          r.update(this.lifeCounter);
        });
        
        this.lifeCounter++;
        if (this.lifeCounter >= this.lifetime) break;
      }
      
      if (this.lifeCounter >= this.lifetime || this.isGenerationOver()) {
        this.nextGeneration();
      }
    }
  
    // Draw current simulation state
    draw() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw landing pad
      this.ctx.fillStyle = '#0f0';
      this.ctx.fillRect(this.landingX - 10, this.canvas.height - 30, 20, 20);
      
      // Draw obstacle
      this.ctx.fillStyle = '#f00';
      this.ctx.fillRect(this.obstacleX - this.obstacleSize / 2, this.canvas.height / 2, this.obstacleSize, 20);
      
      // Draw rockets
      this.population.forEach(r => r.draw(this.ctx));
    }
  
    // Draw static elements (used for setup and reset)
    drawSetup() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.fillStyle = '#0f0';
      this.ctx.fillRect(this.landingX - 10, this.canvas.height - 30, 20, 20);
      
      this.ctx.fillStyle = '#f00';
      this.ctx.fillRect(this.obstacleX - this.obstacleSize / 2, this.canvas.height / 2, this.obstacleSize, 20);
    }
  
    // Main simulation loop
    loop() {
      if (!this.running) return;
      
      this.update();
      this.draw();
      
      this.statusText.innerText = this.paused ? 
        `Paused in generation ${this.generation}...` : 
        `Simulating generation ${this.generation}...`;
      
      requestAnimationFrame(() => this.loop());
    }
  
    // Start simulation
    startSimulation() {
      this.landingX = parseInt(this.landingXSlider.value);
      this.obstacleX = parseInt(this.obstacleXSlider.value);
      this.obstacleSize = parseInt(this.obstacleSizeSlider.value);
      this.windForce = parseFloat(this.windSlider.value);
      this.simSpeed = parseFloat(this.simSpeedSlider.value);
      this.lifetime = parseInt(this.genTimeSlider.value);
  
      this.generation = 0;
      this.initPopulation();
      this.generationSpan.innerText = this.generation;
      this.statusText.innerText = `Simulating generation ${this.generation}...`;
      this.running = true;
      this.paused = false;
      this.pauseBtn.textContent = "Pause";
      this.loop();
    }
  
    // Toggle pause state
    togglePause() {
      this.paused = !this.paused;
      this.pauseBtn.textContent = this.paused ? "Resume" : "Pause";
    }
  
    // Reset simulation
    resetSimulation() {
      this.running = false;
      this.paused = false;
      this.generation = 0;
      this.lifeCounter = 0;
      this.initPopulation();
      this.generationSpan.innerText = "0";
      this.bestErrorSpan.innerText = "0";
      this.statusText.innerText = "Inactive";
      this.pauseBtn.textContent = "Pause";
      this.drawSetup();
    }
  
    // Replay best rocket
    replayBest() {
      if (!this.bestRocketEver || this.bestRocketEver.trajectory.length === 0) {
        alert("No successful iteration to replay yet.");
        return;
      }
      
      this.running = false;
      this.paused = true;
      this.statusText.innerText = "Replaying best iteration...";
      this.pauseBtn.textContent = "Pause";
      
      let index = 0;
      const replayLoop = () => {
        if (index < this.bestRocketEver.trajectory.length) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          
          this.ctx.fillStyle = '#0f0';
          this.ctx.fillRect(this.landingX - 10, this.canvas.height - 30, 20, 20);
          
          this.ctx.fillStyle = '#f00';
          this.ctx.fillRect(this.obstacleX - this.obstacleSize / 2, this.canvas.height / 2, this.obstacleSize, 20);
          
          const { x, y } = this.bestRocketEver.trajectory[index];
          
          this.ctx.save();
          this.ctx.translate(x, y);
          this.ctx.fillStyle = '#00aaff';
          this.ctx.beginPath();
          this.ctx.moveTo(0, -10);
          this.ctx.lineTo(-5, 10);
          this.ctx.lineTo(5, 10);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.restore();
          
          index++;
          requestAnimationFrame(replayLoop);
        } else {
          this.statusText.innerText = "Replay finished.";
        }
      };
      
      replayLoop();
    }
  }