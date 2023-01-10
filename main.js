'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let point; // variable to display a point on a surface
let userPointCoord; // the coordinate of a point on the texture
let userRotAngle; // texture rotation angle

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.countText = 0;
    this.count = 0;

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (points) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STREAM_DRAW);

        this.countText = points.length / 2;
    }
    // Draw the surface
    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);


        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
    // Draw a point on the surface
    this.DrawPoint = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}

// Function to create point geometry
function CreateSphereSurface(r = 0.1) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -Math.PI * 0.5;
    while (lon < Math.PI) {
        while (lat < Math.PI * 0.5) {
            let v1 = sphereSurfaceDate(r, lon, lat);
            vertexList.push(v1.x, v1.y, v1.z);
            lat += 0.05;
        }
        lat = -Math.PI * 0.5
        lon += 0.05;
    }
    return vertexList;
}

function sphereSurfaceDate(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return { x: x, y: y, z: z };
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;
    // Variables to pass to the shader
    this.iUserPoint = -1; 
    this.irotAngle = 0;
    this.iUP = -1;
    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    // Passing variables to the shader
    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform2fv(shProgram.iUserPoint, [userPointCoord.x, userPointCoord.y]);
    gl.uniform1f(shProgram.irotAngle, userRotAngle);
    gl.uniform2fv(shProgram.iUserPoint, [userPointCoord.x, userPointCoord.y]); //giving coordinates of user point
    gl.uniform1f(shProgram.irotAngle, userRotAngle);

    surface.Draw();
    let translation = damping(map(userPointCoord.x, 0, 1, 0, 36),map(userPointCoord.y, 0, 1, 0, Math.PI*2))
    gl.uniform3fv(shProgram.iUP, [translation.x, translation.y, translation.z]);

    // Change the rotation angle to display a point on a surface without a texture
    gl.uniform1f(shProgram.irotAngle, 1100);
    point.DrawPoint();
}

function CreateSurfaceData() {
    let vertexList = [];

    // Equations parameters
    const m = 6;
    const b = 6 * m;
    let u = 0;

    // Surface of Revolution with Damping Circular Waves
    for (let r = 0; r <= b; r += 0.2) {
        for (let uGeg = 0; uGeg < 360; uGeg += 5) {
            u = deg2rad(uGeg);

            let v1 = damping(r, u);
            let v2 = damping(r + 0.2, u);
            let v3 = damping(r, u + deg2rad(5));
            let v4 = damping(r + 0.2, u + deg2rad(5));

            //One triangle
            vertexList.push(v1.x, v1.y, v1.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v3.x, v3.y, v3.z);
            
            //Another triangle
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v4.x, v4.y, v4.z);
            vertexList.push(v3.x, v3.y, v3.z);
        }
    }

    return vertexList;
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}

function CreateTextureData() {
    let vertexList = [];
    const m = 6;
    const b = 6 * m;

    // Surface of Revolution with Damping Circular Waves
    for (let r = 0; r <= b; r += 0.2) {
        for (let uGeg = 0; uGeg < 360; uGeg += 5) {
            let u = map(r, 0, b, 0, 1);
            let v = map(uGeg, 0, 360, 0, 1);
            vertexList.push(u, v);
            u = map(r + 0.2, 0, b, 0, 1);
            vertexList.push(u, v);
            u = map(r, 0, b, 0, 1);
            v = map(uGeg + 5, 0, 360, 0, 1);
            vertexList.push(u, v);
            u = map(r + 0.2, 0, b, 0, 1);
            v = map(uGeg, 0, 360, 0, 1);
            vertexList.push(u, v);
            u = map(r + 0.2, 0, b, 0, 1);
            v = map(uGeg + 5, 0, 360, 0, 1);
            vertexList.push(u, v);
            u = map(r, 0, b, 0, 1);
            v = map(uGeg + 5, 0, 360, 0, 1);
            vertexList.push(u, v);
        }
    }
    return vertexList;
}

function damping(r, u) {
    // Equations parameters
    const m = 6;
    const b = 6 * m;
    const a = 4 * m;
    const n = 0.1;
    const fi = 0;
    const omega = m * Math.PI / b;

    // Point parameters
    let x = r * Math.cos(u);
    let y = r * Math.sin(u);
    let z = a * Math.pow(Math.E, -n * r) * Math.sin(omega * r + fi);

    // Transform coordinates to make surface smaller
    return { x: x / 20, y: y / 20, z: z / 20 }
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    // Parameters for passing variables to the shader
    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iUserPoint = gl.getUniformLocation(prog, 'userPoint');
    shProgram.irotAngle = gl.getUniformLocation(prog, 'rotA');
    shProgram.iUP = gl.getUniformLocation(prog, 'translateUP');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    
    point = new Model('Point');
    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    LoadTexture()
    surface.TextureBufferData(CreateTextureData());
    point.BufferData(CreateSphereSurface())
    
    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    userPointCoord = { x: 0.1, y: 0.1 };
    userRotAngle = 0.0;
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}

// Function of loading a picture as a texture for a surface
function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    const image = new Image();
    image.crossOrigin = 'anonymus';

    // String with source of the texture
    image.src = "https://raw.githubusercontent.com/antonpasichniuk/WebGL/CGW/texture.jpg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );

        draw();
    }
}

// Function to read user input
// To move a point on a surface
window.onkeydown = (e) => {
    switch (e.keyCode) {
        case 87:
            userPointCoord.x -= 0.01;
            break;
        case 83:
            userPointCoord.x += 0.01;
            break;
        case 65:
            userPointCoord.y += 0.01;
            break;
        case 68:
            userPointCoord.y -= 0.01;
            break;
    }
    userPointCoord.x = Math.max(0.001, Math.min(userPointCoord.x, 0.999));
    userPointCoord.y = Math.max(0.001, Math.min(userPointCoord.y, 0.999));

    draw();
}

// Function to rotate the texture
onmousemove = (e) => {
    userRotAngle = map(e.clientX, 0, window.outerWidth, 0, Math.PI);
    draw();
};
