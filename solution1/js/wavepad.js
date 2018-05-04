/**
 * Based on https://robots.thoughtbot.com/pong-clone-in-javascript
 *
 * Objectives:
 * 		DONE	1- Reduce use of global variables: Just to see the avantages/disavantages on code design.
 *		DONE	2- Try to decouple everything and to keep things DRY.
 *		DONE	3- Use Prototype delegation combined with OO design as a solution for objectives 1 and 2.
 *		DONE	4- Fluid design: Adapt canvas size too fit screen (at least on page load).
 *		DONE	5- Add something new and original to the game.
 *		TODO	6- Add something new and original to the game: What I actually wanted -> Waving walls.
 *
 * Analysis, criticism and thoughts:
 *		- Probably over-engineered, but it's an exercise.
 *		- Physical model metaphor might have been taken too far.
 *		- Maybe a global supervisor wouldn't be so bad after all?
 *		- Using some module scoped global variables doesn't look so bad anymore for such as simple application.
 *		  However, functions and logic should still be decoupled and "reusable" as much as possible. There are some
 *		  improvements compared to the thoughbot.com example, but would the extra labor really be worth it in
 *		  a production context?
 *
 * Comments and solutions:
 *		If you have comments or constructive criticism or ways to improve my code, please contact me.
 *		This is myself training myself to become a better programmer. Help always wanted.
 *
 * Author: Loïc Benoit
 * Website: loicbenoit.com
 * Licence: MIT
 *
 * ----------------------------------------------
 *	Copyright 2018 Loïc Benoit
 *	
 *	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without
 *	restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 *	Software is furnished to do so, subject to the following conditions:
 *	
 *	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *	
 *	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *	NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *	
 **/

(function () {
	
	//--------------------------------------------------------------------------
	// App logic
	//--------------------------------------------------------------------------

	//From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
	function getRandomInt(max) {
		return Math.floor(Math.random() * Math.floor(max));
	}
	
	//--------------------------------------------
	// WorldObject
	//--------------------------------------------
	/**
	 * Prototype for objects that have a position and size in the game world.
	 * Note: Gradients are 0 by default. Overwrite the gradient methods as needed.
	 * Note: Use world cartesian coordinates for x and y, with (0,0) in bottom left corner.
	 * Note: x and y should approximate the center of mass. It makes for a better, more general
	 *			physical model. Opens up more possibilities for extending the game.
	 **/
	function WorldObject(x, y, xLen, yLen)
	{
		// World coordinate of the object (usually the center, always the official coordinates).
		// Must be a number. Will be rounded to nearest integer.
		if( ! isFinite(x))
		{
			throw new Error('Usage: x must be a finite number. Got: ' + x);
		}
		this.x = Math.round(x);
		
		if( ! isFinite(y))
		{
			throw new Error('Usage: y must be a finite number. Got: ' + y);
		}
		this.y = Math.round(y);
		
		// Length of the object (length of the projection in a given dimension).
		// Must be at least 1 and an integer.
		if( ! (isFinite(xLen) && xLen >= 1))
		{
			throw new Error('Usage: xLen must be a finite number greater or equal to 1. Got: ' + xLen);
		}
		this.xLen = Math.round(xLen);
		
		if( ! (isFinite(yLen) && yLen >= 1))
		{
			throw new Error('Usage: yLen must be a finite number greater or equal to 1. Got: ' + yLen);
		}
		this.yLen = Math.round(yLen);
		
		// Rate of change in position.
		this.dx = 0;
		this.dy = 0;
		
		// Rate of change in length.
		this.dxLen = 0;
		this.dyLen = 0;
	}
	
	// Minimum position in x
	WorldObject.prototype.xMin = function() {
		// Coordinates are integers
		return Math.round(this.x - (0.5 * this.xLen));
	}
		
	// Maximum position in x
	WorldObject.prototype.xMax = function() {
		// Coordinates are integers
		return Math.round(this.x + (0.5 * this.xLen));
	}
		
	// Minimum position in y
	WorldObject.prototype.yMin = function() {
		// Coordinates are integers
		return Math.round(this.y - (0.5 * this.yLen));
	}
		
	// Maximum position in y
	WorldObject.prototype.yMax = function() {
		// Coordinates are integers
		return Math.round(this.y + (0.5 * this.yLen));
	}
	
	// Is the given object touching "this"?
	WorldObject.prototype.touches = function(obj){
		// Simultaneous x and y overlaps of the projections of both objects on the plane axis.
		return ((obj.xMax() >= this.xMin()) && (obj.xMin() <= this.xMax()))
			&& ((obj.yMax() >= this.yMin()) && (obj.yMin() <= this.yMax()));
	}
	
	// Bounce horizontally on another WorldObject or a list of WordObjects.
	// Note: Will ignore objects that are too far to bounce on.
	WorldObject.prototype.horizontalBounce = function(surfaces){
		if( ! Array.isArray(surfaces))
		{
			surfaces = [surfaces];
		}
		
		for(var i = 0; i < surfaces.length; i++)
		{
			if(this.touches(surfaces[i]))
			{
				// Make sure we're moving away from the object.
				// Note: While bouncing, objects may overlap. Blindly reversing the direction might
				//			make the object bounce inside the surface instead of continuously moving away.
				if(
					(this.x <= surfaces[i].x && this.dx >= 0) //Bounce left
					|| (this.x > surfaces[i].x && this.dx <= 0) //Bounce right
				)
				{
					//Move left
					this.dx = -1 * this.dx;
				}
				
				// Approximate reflexion relative to the normal vector.
				// Rem: Computes the change in perpendicular direction when bouncing on an angled surface.
				// Rem: The inverse of the gradient approximates the change in speed due to bouncing. 
				this.dy = this.dy - surfaces[i].xGradientAt(this.y);
			}
		}
	}
	
	// Bounce vertically on another WorldObject or a list of WordObjects.
	// Note: Will ignore objects that are too far to bounce on.
	WorldObject.prototype.verticalBounce = function(surfaces){
		if( ! Array.isArray(surfaces))
		{
			surfaces = [surfaces];
		}
		
		for(var i = 0; i < surfaces.length; i++)
		{
			if(this.touches(surfaces[i]))
			{
				// Make sure we're moving away from the object.
				// Note: While bouncing, objects may overlap. Blindly reversing the direction might
				//			make the object bounce inside the surface instead of continuously moving away.
				if(
					(this.y <= surfaces[i].y && this.dy >= 0) //Bounce down
					|| (this.y > surfaces[i].y && this.dy <= 0) //Bounce up
				)
				{
					//Move left
					this.dy = -1 * this.dy;
				}
				
				// Approximate reflexion relative to the normal vector.
				// Rem: Computes the change in perpendicular direction when bouncing on an angled surface.
				// Rem: The inverse of the gradient approximates the change in speed due to bouncing. 
				this.dx = this.dx - surfaces[i].yGradientAt(this.x);
				
				// Add some randomness to the ball movements.
				if(Math.random() > 0.75)
				{
					var dyCache = this.dy;
					this.dy = (Math.random() >= 0.5) ? Math.round(this.dy * 1.3) : Math.round(this.dy * 0.8);
					this.dy = this.dy != 0 ? this.dy : dyCache;
				}
			}
		}
	}
	
	// Compute the surface approximate slope in x around (x,y).
	// Use case: Approximating the change in speed in the perpendicular dimension due to bouncing on an angled surface.
	WorldObject.prototype.xGradientAt = function(x, y){
		return 0;
	}
	
	// Compute the surface approximate slope in y around (x,y).
	// Use case: Approximating the change in speed in the perpendicular dimension due to bouncing on an angled surface.
	WorldObject.prototype.yGradientAt = function(x, y){
		return 0;
	}

	//--------------------------------------------
	// Ball
	//--------------------------------------------
	/**
	 * The ball
	 **/
	function Ball(x, y, radius)
	{
		// Must be at least 1 and must be an integer.
		radius = radius && radius >= 1 ? Math.round(radius) : 1;
		
		WorldObject.call(this, x, y, 2 * radius, 2 * radius);
		this.radius = radius;
		this.dy = 3;
	}
	
	Ball.prototype = Object.create(WorldObject.prototype);
	Ball.prototype.constructor = Ball;
	
	Ball.prototype.update = function(world) {
		this.horizontalBounce(world.getVerticalSurfaces());
		this.verticalBounce(world.getHorizontalSurfaces());
		this.x += this.dx;
		this.y += this.dy;
	};	
	
	Ball.prototype.render = function(world) {
		world.context.beginPath();
		world.context.arc(this.x, this.y, this.radius, 2 * Math.PI, false);
		world.context.fillStyle = world.color.primary;
		world.context.fill();
	};	

	//--------------------------------------------
	// Paddle
	//--------------------------------------------
	/**
	 * A paddle is the usual representation of a Player.
	 **/
	function Paddle(x, y, xLen, yLen)
	{
		// Must be an integer greater than 0.
		xLen = xLen && xLen >= 1 ? Math.round(xLen) : 20;
		yLen = yLen && yLen >= 1 ? Math.round(yLen) : 10;
		
		WorldObject.call(this, x, y, xLen, yLen);
	}
	
	Paddle.prototype = Object.create(WorldObject.prototype);
	Paddle.prototype.constructor = Paddle;
	
	// Compute the surface approximate slope in x around (x,y).
	// Use case: Approximating the change in speed in the perpendicular dimension due to bouncing
	// on an angled surface or moving object.
	Paddle.prototype.xGradientAt = function(x, y){
		return this.dx;
	}
	
	// Compute the surface approximate slope in y around (x,y).
	// Use case: Approximating the change in speed in the perpendicular dimension due to bouncing
	// on an angled surface or moving object.
	Paddle.prototype.yGradientAt = function(x, y){
		return this.dx;
	}
	
	Paddle.prototype.update = function(world) {
		this.horizontalBounce(world.getVerticalSurfaces());
		this.x += this.dx;
		this.dy = 0;
	};	
	
	Paddle.prototype.render = function(world) {
		world.context.fillStyle = world.color.primary;
		world.context.fillRect(this.xMin(), this.yMin(), this.xLen, this.yLen);
	};
	
	//--------------------------------------------
	// Player
	//--------------------------------------------
	/**
	 * A Player.
	 **/
	function Player(body, goal, codeName)
	{
		this.body = body;
		this.moveLeftKey = 37;
		this.moveRightKey = 39;
		this.goal = goal;
		this.maxDx = 10;
		this.codeName = codeName ? codeName : 'player';
	}
	
	Player.prototype.getLosses = function(){
		return this.goal.countBalls();
	};
	
	Player.prototype.update = function(world){
		
		//Forget previous speed (makes the paddle stop when not hitting a key).
		this.body.dx = 0;
		this.body.dy = 0;
		
		//Compute new speed.
		//Note: using global keysDown. Found no elegant way to remove this global variable.
		for(var key in keysDown)
		{
			//Moving faster when repeating the same direction.
			switch(Number(key))
			{
				case this.moveLeftKey:
					this.body.dx = -1 * this.maxDx;
					break;
				case this.moveRightKey:
					this.body.dx = this.maxDx;
					break;
				default:
					break;
			}
		}
		
		// Bounce on obstacles before next rendering.
		this.body.update(world);
		
		// Catch balls
		this.goal.catchBalls(world);
	};
	
	Player.prototype.render = function(world){
		this.body.render(world);
	};
	
	//--------------------------------------------
	// Computer
	//--------------------------------------------
	/**
	 * An automated Player.
	 **/
	function Computer(body, goal, codeName)
	{
		Player.call(this, body, goal, name);
		this.moveLeftKey = null;
		this.moveRightKey = null;
		this.maxDx = 10;
		this.codeName = codeName ? codeName : 'computer';
	}
	
	Computer.prototype = Object.create(Player.prototype);
	Computer.prototype.constructor = Computer;

	Computer.prototype.update = function(world){
		
		if(world.balls.length > 0)
		{
			var ball = world.balls[0];
			
			var distanceToBall = this.body.y - ball.y;
			var minTrackingDistance = Math.round(0.15 * world.yLen());
			
			// If the ball is moving toward the paddle, move toward the ball
			// Constraint: Stop ball tracking when getting too close, to give other players a chance.
			if(ball.dy > 0 && (distanceToBall > minTrackingDistance))
			{
				// Calculate x distance to ball and set change in position accordingly (perfect tracking).
				this.body.dx = ball.x - this.body.x;
			}
			// Give some x speed to the ball if:
			//		1) The ball is moving toward the paddle (optimisation to avoid calling touches).
			//		2) Only when the ball has x speed (to preserve iddle start at the start of a game).
			//		3) Only when the ball touches the paddle.
			// Note: When touching the paddle, the ball may receive some of the paddle's speed.
			//			This is why giving speed to the paddle can accelerate the ball, even do
			//			we're not actually changing the ball's speed (allowing the ball to define its
			//			own bouncing logic, for various types of balls).
			//			This is coherent with the WorldObject metaphor and object decoupling.
			else if(ball.dy > 0 && Math.abs(ball.dx) > 0 && (this.body.touches(ball)))
			{
				this.body.dx = Math.round(0.6 * this.maxDx);
				//Reverse direction for more ball effects...
				this.body.dx = ball.dx > 0 ? -1 * this.body.dx : this.body.dx;
			}
		}
		
		//Limit x speed
		if(Math.abs(this.body.dx) > this.maxDx)
		{
			this.body.dx = this.body.dx > 0 ? this.maxDx : -1 * this.maxDx;
		}

		// Bounce on obstacles before next rendering.
		this.body.update(world);
		
		//Never move vertically (even when bouncing on obstacles).
		this.body.dy = 0;
		
		// Catch balls
		this.goal.catchBalls(world);
	};

	//--------------------------------------------
	// Walls
	//--------------------------------------------
	/**
	 * A wall to prevent the ball from escaping on each sides (vertically).
	 **/
	function LeftWall(x, y, xLen, yLen)
	{
		WorldObject.call(this, x, y, xLen, yLen);
		this.t = 0;
		this.f = 1;
		this.a0 = 0.15;
		this.a = 0;
		this.p = 0;
		this.omega = 0;
	}
	
	LeftWall.prototype = Object.create(WorldObject.prototype);
	LeftWall.prototype.constructor = LeftWall;
	
	LeftWall.prototype.update = function(world) {
	};	
	
	LeftWall.prototype.render = function(world) {
		world.context.fillStyle = world.color.wall;
		world.context.fillRect(this.xMin(), this.yMin(), this.xLen, this.yLen);
	};
	
	/**
	 * A wall to prevent the ball from escaping on each sides (vertically).
	 **/
	function RightWall(x, y, xLen, yLen)
	{
		WorldObject.call(this, x, y, xLen, yLen);
	}
	
	RightWall.prototype = Object.create(WorldObject.prototype);
	RightWall.prototype.constructor = RightWall;
	
	RightWall.prototype.update = function(world) {
	};	
	
	RightWall.prototype.render = function(world) {
		world.context.fillStyle = world.color.wall;
		world.context.fillRect(this.xMin(), this.yMin(), this.xLen, this.yLen);
	};
	
	
	//--------------------------------------------
	// Goal
	//--------------------------------------------
	/**
	 * A goal to prevent the ball from escaping on top sides (horizontaly).
	 **/
	function Goal(x, y, xLen, yLen, player)
	{
		WorldObject.call(this, x, y, xLen, yLen);
		this.balls = [];
	}
	
	Goal.prototype = Object.create(WorldObject.prototype);
	Goal.prototype.constructor = Goal;
	
	Goal.prototype.countBalls = function() {
		return this.balls.length;
	}
	
	Goal.prototype.catchBalls = function(world) {
		for(var i = 0; i < world.balls.length; i++)
		{
			var ball = world.balls[i];
			if(ball.touches(this))
			{
				this.balls.push(ball);
				world.removeBall(i);
			}
		}
	};	
	
	Goal.prototype.render = function(world) {
		world.context.fillStyle = world.color.background;
		world.context.fillRect(this.xMin(), this.yMin(), this.xLen, this.yLen);
	};
	
	//--------------------------------------------
	// World
	//--------------------------------------------
	/**
	 * The ball
	 **/
	function World(canvas, context)
	{
		this.canvas = canvas;
		this.context = context;
		this.balls = [];
		this.players = [];
		this.walls = [];
		this.randomWalls = [];
		this.goals = [];
		this.color = {
			primary: "#c86b04",
			wall: '#000022',
			background: '#00ffff',
		};
		this.settings = {
			ballRadius: 8,
			goalYLen: 1,
			paddleXLen: 80,
			paddleYLen: 10,
			wallXLen: 200,//2,
		};
		this.scores = [];
		this.t = 0;
	}
	
	World.prototype.xLen = function(){
		return this.canvas.width;
	};
	
	World.prototype.yLen = function(){
		return this.canvas.height;
	};
	
	World.prototype.xMiddle = function(){
		return Math.round(0.5 * this.canvas.width);
	};
	
	World.prototype.yMiddle = function(){
		return Math.round(0.5 * this.canvas.height);
	};
	
	World.prototype.getVerticalSurfaces = function(){
		return this.walls;
	};
	
	World.prototype.getHorizontalSurfaces = function(){
		//No vertical bouncing of walls, else the ball just bounces back in an unatural way.
		return this.players.map(player => player.body);
	};
	
	World.prototype.getGoals = function(){
		return this.players.map(player => player.goal);
	};
	
	World.prototype.addBall = function(){
		//REM: Create ball low enough to allow the computer to detect it. Else the player gets free points because
		//		 the computer takes too long to detect a new ball... Dont' create it at y=0, else the computer scores
		//		 free points, continously.
		this.balls.push(new Ball(this.xMiddle(), Math.round(0.2 * this.yMiddle()), this.settings.ballRadius));
	};
	
	World.prototype.getDefaultWalls = function(){
		return [
			//Left
			new LeftWall(
				0,							//x (wall center)
				this.yMiddle(),		//y (wall center)
				this.settings.wallXLen,	//xLen
				this.yLen()				//yLen
			),
			//Right
			new RightWall(
				this.xLen()-1,
				this.yMiddle(),
				this.settings.wallXLen,
				this.yLen()
			),
		];
	};
	
	World.prototype.getRandomWalls = function(){
		return [
			//Left
			new LeftWall(
				this.settings.wallXLen + getRandomInt(100),	//x (wall center)
				70 + getRandomInt(this.yMiddle()),										//y (wall center)
				10 + getRandomInt(50),														//xLen
				10 + getRandomInt(Math.round(0.5 * this.yLen()))					//yLen
			),
			//Right
			new RightWall(
				this.xLen() - getRandomInt(this.xMiddle()),
				70 + getRandomInt(this.yMiddle()),
				20 + getRandomInt(50),
				20 + getRandomInt(Math.round(0.5 * this.yLen()))
			),
		];
	};
	
	World.prototype.removeBall = function(index){
		return this.balls.splice(index, 1);
	};
	
	//Use a cartesian coordinate system with (0,0) in the bottom left corner.
	World.prototype.resetCartesianContext = function(){
		this.context.translate(0, canvas.height),
		this.context.scale(1, -1);
	};
	
	World.prototype.init = function(options = {}){
		this.settings = Object.create(
			this.settings,
			options
		);
		
		this.addBall();
		
		this.players = [
			new Player(
				new Paddle(
					this.xMiddle(),
					Math.round(0.5 * this.settings.paddleYLen) + this.settings.goalYLen, //Bottom + Half the paddle + goal height.
					this.settings.paddleXLen,
					this.settings.paddleYLen
				),
				new Goal(
					this.xMiddle(),
					1,
					this.xLen(),
					this.settings.goalYLen
				),
				'player1'
			),
			new Computer(
				new Paddle(
					this.xMiddle(),
					this.yLen() - Math.round(0.5 * this.settings.paddleYLen) - this.settings.goalYLen,  //Top less half the paddle less goal height.
					this.settings.paddleXLen,
					this.settings.paddleYLen
				),
				new Goal(
					this.xMiddle(),
					this.yLen() - 1,
					this.xLen(),
					this.settings.goalYLen
				),
				'player2'
			)
		];
		
		this.walls = this.getDefaultWalls();
	};
	
	// Update the state of every world entity.
	World.prototype.update = function(){
		if(this.balls.length < 1)
		{
			this.addBall();
		}

		for(var i = 0; i < this.walls.length; i++)
		{
			this.walls[i].update(world);
		}
		
		// Update players
		for(var i = 0; i < this.players.length; i++)
		{
			this.players[i].update(world);
		}
		
		// Update balls
		for(var i = 0; i < this.balls.length; i++)
		{
			this.balls[i].update(world);
		}
		
		// Update scores
		this.scores = [];
		for(var i = 0; i < this.players.length; i++)
		{
			//TODO: Need to track who scored...
			// Maybe: Update a property like "ball.sender" when a player bounces the ball.
			//			Iterate through the list of all caught balls to compute scores.
			this.scores.push(this.players[i].getLosses());
		}
		
		// Update walls
		// Random walls: At periodic intervals for some stability + some random chance.
		if(this.t % 120 == 0 && Math.random() > 0.75)
		{
			// Make sure to always have lateral walls.
			this.walls = this.getDefaultWalls();
			
			// 80% chance of clearing previous random walls.
			// 20% chance of accumulating random walls that block your way!
			this.randomWalls = (Math.random() > 0.2)
				? this.getRandomWalls() //Clear previous walls
				: this.randomWalls.concat(this.getRandomWalls()); //Accumulate previous
			
			this.walls = this.walls.concat(this.randomWalls);
			this.t = 0;
		}
		this.t++;
		
		return true;
	};
	
	// Render every world entity in its current state.
	World.prototype.render = function(){
		// Clear the canvas (redraw from scratch)
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		// Render balls
		for(var i = 0; i < this.balls.length; i++)
		{
			this.balls[i].render(this);
		}
		
		// Render players
		for(var i = 0; i < this.players.length; i++)
		{
			this.players[i].render(this);
		}
		// Render walls
		for(var i = 0; i < this.walls.length; i++)
		{
			this.walls[i].render(this);
		}
		
		//Render points
		this.context.resetTransform();

		this.context.font = 'bold 16pt Arial';
		this.context.textAlign = 'center';
		this.context.fillStyle = this.color.primary;
		this.context.fillText(this.scores.join(' / '), this.xMiddle(), this.yMiddle());
		
		this.resetCartesianContext();
	};
	
	
	//--------------------------------------------------------------------------
	// Main script
	//--------------------------------------------------------------------------
	
	//--------------------------------------------
	// Our loop controller
	//--------------------------------------------
	var animate = window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function(callback) { window.setTimeout(callback, 1000/60) };
	
	//--------------------------------------------
	// Configure the canvas
	//--------------------------------------------
	var canvas = document.getElementById('wavepad');
	if( ! canvas || ! canvas.getContext)
	{
		console.log('Failed to get canvas.');
		return;
	}
	console.log('Loading Wavepad.');
	
	var context = canvas.getContext('2d');
	
	//--------------------------------------------
	// Create the world and all things to be.
	//--------------------------------------------
	var world = new World(canvas, context);
	world.init();
	world.resetCartesianContext();
	
	//--------------------------------------------
	// One step of the loop
	//--------------------------------------------
	var step = function() {
		var changed = world.update();
		if(changed)
		{
			world.render();
		}
		animate(step);
	};

	//--------------------------------------------
	// Event listeners
	//--------------------------------------------
	keysDown = {};

	window.addEventListener("keydown", function(event) {
		keysDown[event.keyCode] = true;
	});

	window.addEventListener("keyup", function(event) {
		delete keysDown[event.keyCode];
	});
		
	//--------------------------------------------
	// Start the loop
	//--------------------------------------------
	window.onload = function() {
		animate(step);
	};
	
}());
