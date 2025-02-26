// Rocket class definition
class Rocket {
    constructor(dna, config) {
      this.canvas = config.canvas;
      this.landingX = config.landingX;
      this.obstacleX = config.obstacleX;
      this.obstacleSize = config.obstacleSize;
      this.windForce = config.windForce;
      this.GENE_FACTOR = config.GENE_FACTOR;
      this.WIND_SCALE = config.WIND_SCALE;
      this.GRAVITY = config.GRAVITY;
      this.lifetime = config.lifetime;
      
      this.pos = { x: this.canvas.width / 2, y: 50 };
      this.vel = { x: 0, y: 0 };
      this.acc = { x: 0, y: 0 };
      this.completed = false;
      this.crashed = false;
      this.timedOut = false;
      this.dna = dna || this.createRandomDNA();
      this.fitness = 0;
      this.trajectory = [];
    }
  
    createRandomDNA() {
      const dna = [];
      for (let i = 0; i < this.lifetime; i++) {
        dna.push({
          x: (Math.random() * 2 - 1) * this.GENE_FACTOR,
          y: (Math.random() * 2 - 1) * this.GENE_FACTOR
        });
      }
      return dna;
    }
  
    applyForce(force) {
      this.acc.x += force.x;
      this.acc.y += force.y;
    }
  
    update(step) {
      if (!this.completed && !this.crashed && !this.timedOut) {
        // Apply force based on DNA
        if (step < this.dna.length) {
          this.applyForce(this.dna[step]);
        }
        // Apply environmental forces
        this.applyForce({ x: this.windForce * this.WIND_SCALE, y: this.GRAVITY });
        // Integrate physics
        this.vel.x += this.acc.x;
        this.vel.y += this.acc.y;
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        this.acc = { x: 0, y: 0 };
        // Store trajectory path
        this.trajectory.push({ x: this.pos.x, y: this.pos.y });
        // Check landing: considering landing pad center at (landingX, canvas.height - 20)
        if (Math.abs(this.pos.x - this.landingX) < 10 && this.pos.y >= this.canvas.height - 50) {
          this.completed = true;
          this.pos.x = this.landingX;
        }
        // Obstacle collision check
        if (
          this.pos.y > this.canvas.height / 2 &&
          this.pos.y < this.canvas.height / 2 + 20 &&
          this.pos.x > this.obstacleX - this.obstacleSize / 2 &&
          this.pos.x < this.obstacleX + this.obstacleSize / 2
        ) {
          this.crashed = true;
        }
        // Check if out of bounds
        if (this.pos.x < -20 || this.pos.x > this.canvas.width + 20 || this.pos.y > this.canvas.height) {
          this.crashed = true;
        }
      }
    }
  
    calcFitness() {
      // Compute error using Euclidean distance from the target landing pad center.
      const targetY = this.canvas.height - 20;
      const dx = this.pos.x - this.landingX;
      const dy = this.pos.y - targetY;
      const error = Math.sqrt(dx * dx + dy * dy);
      // Fitness is inverse of error (plus 1 to avoid division by zero)
      this.fitness = 1 / (error + 1);
      if (this.completed) this.fitness *= 10;
      if (this.crashed) this.fitness /= 10;
    }
  
    draw(ctx) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);
      if (this.timedOut) {
        ctx.fillStyle = '#f00';
      } else if (this.completed) {
        ctx.fillStyle = '#0f0';
      } else if (this.crashed) {
        ctx.fillStyle = '#888';
      } else {
        ctx.fillStyle = '#00aaff';
      }
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-5, 10);
      ctx.lineTo(5, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }