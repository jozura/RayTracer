function degToRad(d) {
    return d * Math.PI / 180;
}

function multiplyVector(a, b) {
	let c = []
	for (i = 0; i < a.length; i++) {
		c.push(a[i]*b)
	}
	return c
}

function dot(a, b) {
	var sum = 0;
	for (i = 0; i < a.length; i++) {
		sum += a[i] * b[i]
	}
	return sum
}

function addVectors(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
}

function subtractVectors(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

// Rotates a vector around an arbitrary axis
function rotateAroundAxis(angle,axis,vector){
	let a1 = multiplyVector(vector, Math.cos(angle))
	let a2 = multiplyVector(multiplyVector(axis, dot(axis, vector)), 1.0 - Math.cos(angle))
	let a3 = multiplyVector(cross(axis, vector), Math.sin(angle))
	let res = addVectors(addVectors(a1, a2), a3)
	return res
}


/**
 * Provides requestAnimationFrame in a cross browser way.
 * paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
window.requestAnimationFrame = window.requestAnimationFrame || ( function() {
	return  window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function(  callback, element ) {
				window.setTimeout( callback, 1000 / 60 );
			};
})();

//
class camera  {
  constructor() {
  this.origin = [0,0,0];
	this.lookat = [0,0,1];
	this.right = [1,0,0];
	this.up = [0,1,0];
  this.boundaries = [8, 3, 6]
	this.lookatguide = [0,0,1];
	this.rightguide = [1,0,0];
	this.upguide = [0,1,0];
	this.rotations = {
		x: 0,
		y: 0
		};
  }

  // Translates the cameras origin to the direction of one of the camera axes by @amount.
  translate(amount, direction) {
    let origin = this.origin
	  console.log(direction);
	  if (direction == 'up') {
		this.origin = addVectors(this.origin, multiplyVector(this.lookat, amount));
	  }
	  if (direction == 'down') {
	    this.origin = subtractVectors(this.origin, multiplyVector(this.lookat, amount));
	  }
	  if (direction == 'left') {
		 this.origin = this.origin = subtractVectors(this.origin, multiplyVector(this.right, amount));
	  }
	  if (direction == 'right') {
		 this.origin = addVectors(this.origin, multiplyVector(this.right, amount));
	  }
    // Quick check that we do not move out from the room.
    if (!(-this.boundaries[0] < this.origin[0] && this.origin[0] < this.boundaries[0])){
        this.origin = origin;
    }
    if (!(-this.boundaries[1] < this.origin[1] && this.origin[1] < this.boundaries[1])){
        this.origin = origin;
    }
    if (!(-this.boundaries[2] < this.origin[2] && this.origin[2] < this.boundaries[2])){
        this.origin = origin;
    }
  }

  // Rotates the camera by this.rotations amounts
  rotate() {
		  var lookat = rotateAroundAxis(this.rotations.x, this.rightguide, this.lookatguide);
		  var up = cross(lookat, this.rightguide);

		  this.lookat = rotateAroundAxis(this.rotations.y,this.upguide, lookat);

		  this.up = rotateAroundAxis(this.rotations.y, this.upguide, up);
		  this.right = cross(this.up, this.lookat);
  }
}




var pov;
var canvas,
	gl,
	buffer,
	vertex_shader, fragment_shader,
	currentProgram,
	vertex_position,
	timeLocation,
	resolutionLocation,
	originLocation,
	lookatLocation,
	rightLocation,
	upLocation,
	parameters = {  start_time  : new Date().getTime(),
					u_time        : 0,
          d_time        : 0,
					screenWidth : 0,
					screenHeight: 0 };
  keys = {};

init();
animate();


document.onkeydown = checkKey;
document.onkeyup = checkKey;

function checkKey(e) {
    e = e || window.event;
    keys[e.keyCode] = e.type == 'keydown';

}

function init() {
	pov = new camera();
	vertex_shader = document.getElementById('vs').textContent;
	fragment_shader = document.getElementById('fs').textContent;

	canvas = document.querySelector( 'canvas' );

	// Initialise WebGL

	try {

		gl = canvas.getContext( 'experimental-webgl' );

	} catch( error ) { }

	if ( !gl ) {

		throw "cannot create webgl context";

	}

	// Create Vertex buffer (2 triangles)

	buffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ - 1.0, - 1.0, 1.0, - 1.0, - 1.0, 1.0, 1.0, - 1.0, 1.0, 1.0, - 1.0, 1.0 ] ), gl.STATIC_DRAW );


	// Create Program

	currentProgram = createProgram( vertex_shader, fragment_shader );
	timeLocation = gl.getUniformLocation( currentProgram, 'u_time' );
	resolutionLocation = gl.getUniformLocation( currentProgram, 'u_resolution' );
	originLocation = gl.getUniformLocation( currentProgram, 'u_origin' );
	lookatLocation = gl.getUniformLocation( currentProgram, 'u_lookat');
	rightLocation = gl.getUniformLocation( currentProgram, 'u_right');
	upLocation = gl.getUniformLocation( currentProgram, 'u_up');

}

function createProgram( vertex, fragment ) {

	var program = gl.createProgram();

	var vs = createShader( vertex, gl.VERTEX_SHADER );
	var fs = createShader( '#ifdef GL_ES\nprecision highp float;\n#endif\n\n' + fragment, gl.FRAGMENT_SHADER );

	if ( vs == null || fs == null ) return null;

	gl.attachShader( program, vs );
	gl.attachShader( program, fs );

	gl.deleteShader( vs );
	gl.deleteShader( fs );

	gl.linkProgram( program );

	if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {

		alert( "ERROR:\n" +
		"VALIDATE_STATUS: " + gl.getProgramParameter( program, gl.VALIDATE_STATUS ) + "\n" +
		"ERROR: " + gl.getError() + "\n\n" +
		"- Vertex Shader -\n" + vertex + "\n\n" +
		"- Fragment Shader -\n" + fragment );

		return null;

	}

	return program;

}

function createShader( src, type ) {

	var shader = gl.createShader( type );

	gl.shaderSource( shader, src );
	gl.compileShader( shader );

	if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {

		alert( ( type == gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT" ) + " SHADER:\n" + gl.getShaderInfoLog( shader ) );
		return null;

	}

	return shader;

}

function resizeCanvas( event ) {

	if ( canvas.width != canvas.clientWidth ||
		 canvas.height != canvas.clientHeight ) {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		parameters.screenWidth = canvas.width;
		parameters.screenHeight = canvas.height;
		gl.viewport( 0, 0, canvas.width, canvas.height );
	}

}

function animate() {
	// Limit camera rotation so that it can't rotate over 90 degrees in
    // either direction around the x-axis
	if (pov.rotations.x >= Math.PI / 2) {
		pov.rotations.x = Math.PI / 2;
	};

	if (pov.rotations.x <= -Math.PI / 2) {
		pov.rotations.x = - Math.PI / 2;
	};

	pov.rotate();

	resizeCanvas();
	render();
	requestAnimationFrame( animate );

}

function render() {
	if ( !currentProgram ) return;
  parameters.d_time = parameters.u_time
	parameters.u_time = new Date().getTime() - parameters.start_time;
  let delta = (parameters.u_time - parameters.d_time)/100
  if (keys['87']) {
      pov.translate(delta, 'up');
  }
  if (keys['83']) {
      pov.translate(delta, 'down');
  }
  if (keys['65']) {
     pov.translate(delta, 'left');
  }
  if (keys['68']) {
     pov.translate(delta, 'right');
  }
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	// Load program into GPU

	gl.useProgram( currentProgram );

	// Set values to program variables
	gl.uniform1f( timeLocation, parameters.u_time / 1000 );
	gl.uniform2f( resolutionLocation, parameters.screenWidth, parameters.screenHeight );
	gl.uniform3f( originLocation, pov.origin[0], pov.origin[1], pov.origin[2]);
	gl.uniform3f( lookatLocation, pov.lookat[0], pov.lookat[1], pov.lookat[2]);
	gl.uniform3f( upLocation, pov.up[0], pov.up[1], pov.up[2]);
	gl.uniform3f( rightLocation, pov.right[0], pov.right[1], pov.right[2]);

	// Render geometry

	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.vertexAttribPointer( vertex_position, 2, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vertex_position );
	gl.drawArrays( gl.TRIANGLES, 0, 6 );
	gl.disableVertexAttribArray( vertex_position );

}

// MOUSE CONTROL

canvas.requestPointerLock = canvas.requestPointerLock ||
                            canvas.mozRequestPointerLock;

document.exitPointerLock = document.exitPointerLock ||
                           document.mozExitPointerLock;

canvas.onclick = function() {
  canvas.requestPointerLock();
};

// pointer lock event listeners

// Hook pointer lock state change events for different browsers
document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

function lockChangeAlert() {
  if (document.pointerLockElement === canvas ||
      document.mozPointerLockElement === canvas) {
    console.log('The pointer lock status is now locked');
    document.addEventListener("mousemove", updatePosition, false);
  } else {
    console.log('The pointer lock status is now unlocked');
    document.removeEventListener("mousemove", updatePosition, false);
  }
}

function updatePosition(e) {
  pov.rotations.y += degToRad(e.movementX) % (Math.PI * 2) / 10;
  pov.rotations.x += degToRad(e.movementY) % (Math.PI * 2) / 10;
}
