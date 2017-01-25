//Steven Frisbie 4561991
var canvas;
var gl;
var program;

var axisOfRotation = [vec4(0.0, 1.00), 
                      vec4(0.0, -1.00)];

var controlPoints = [vec4(0.0, 0.75),
                     vec4(0.0, 0.50),
                     vec4(0.0, 0.25),
                     vec4(0.0, 0.0),
                     vec4(0.0, -0.25),
                     vec4(0.0, -0.50),
                     vec4(0.0, -0.75)];

//where the bezier curve vertices are stored
var bezierCurveTop;
var bezierCurveBottom;
var bcInitialized = false;
var sorInitialized = false;

//where the surface of rotation vertices are stored
var surfaceOfRotation;

var fColor;

const black = vec4(0.0, 0.0, 0.0, 1.0);
const yellow = vec4(1.0, 1.0, 0.0, 1.0);
const gray = vec4(0.5, 0.5, 0.5, 1.0);
const blue = vec4(0.0, 0.0, 1.0, 1.0);

var vertices;

//Locations of distinct vertices
const aorLocation = 0;
const cpLocation = 2;
const btLocation = 9;
const bbLocation = 109;
const sorLocation = 209;

//mouseStuff
var lastX, lastY;
var mouseDown = false;
var trackingMouse = false;
var selectedCP;

//couldn't figure out how to implement these. Steps start at 16 though
var angles = 16;
var steps = 16;

//both of these are false at initialization
var inDrawMode = false;
var inViewMode = false;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

//viewing variables
var eye;
var near = -10.0;
var far = 10.0;
var radius = 5.0;
var dr = 5.0 * Math.PI/180.0;
var theta  = 0.0;
var phi    = 0.0;

var left = -1.0;
var right = 1.0;
var ytop = 1.0;
var bottom = -1.0;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

//The method that responds to the 'View/Draw' button click to change the mode.
function selectMode() {
    var b1Elem = document.getElementById("myButton1");
    document.getElementById("demo").innerHTML = "Let's Start";
    if (b1Elem.value=="View Mode")
    {
        viewMethod();
        document.getElementById("demo").innerHTML = "View Mode";
        b1Elem.value = "Draw Mode";
    
    }
    else
    {
        drawMethod();
        document.getElementById("demo").innerHTML = "Draw Mode";
        b1Elem.value = "View Mode";
    }
}


// ########### The 3D Mode for Viewing the Surface of Revolution --- ADD CODE HERE ###########

function viewMethod() 
{
    document.getElementById("demo").innerHTML = "View Mode";
    inDrawMode = false;
    inViewMode = true;
    
    // Set screen clear color to R, G, B, alpha; where 0.0 is 0% and 1.0 is 100%
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}


// ########### The 2D Mode to draw the Bezier Curver --- ADD CODE HERE ###########

function drawMethod() 
{
    document.getElementById("demo").innerHTML = "Draw Mode";
    inViewMode = false;
    inDrawMode = true;
    
    // Set screen clear color to R, G, B, alpha; where 0.0 is 0% and 1.0 is 100%
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
}

// Initializations
window.onload = function init() 
{
   
    // Find the canvas on the page
    canvas = document.getElementById("gl-canvas");
    
    // Initialize a WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) 
    { 
        alert("WebGL isn't available"); 
    }

    vertices = [];

    bezierCurveTop = [];
    bezierCurveBottom = [];
    surfaceOfRotation = [];
    drawBezierCurves();
    bcInitialized = true;
    drawSurfaceOfRotation();
    sorInitialized = true;

    for (var i = 0; i < axisOfRotation.length; i++)
    {
        vertices.push(axisOfRotation[i]);
    }

    for (var i = 0; i < controlPoints.length; i++)
    {
        vertices.push(controlPoints[i]);
    }

    for (var i = 0; i < bezierCurveTop.length; i++)
    {
        vertices.push(bezierCurveTop[i]);
    }

    for (var i = 0; i < bezierCurveBottom.length; i++)
    {
        vertices.push(bezierCurveBottom[i]);
    }

    for (var i = 0; i < surfaceOfRotation.length; i++)
    {
        vertices.push(surfaceOfRotation[i]);
    }
    
    gl.enable(gl.DEPTH_TEST);

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    // Load shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    fColor = gl.getUniformLocation(program, "fColor");

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    canvas.addEventListener("mousedown", function(event)
    {
        mouseDown = true;
        var x = (2*event.clientX/canvas.width-1) - .03;
        var y = (2*(canvas.height-event.clientY)/canvas.height-1) + .25;
        if (mouseOnPoint(x, y))
        {
            trackingMouse = true;
        }
    });

    canvas.addEventListener("mouseup", function(event)
    {
        trackingMouse = false;
        mouseDown = false;
    });

    canvas.addEventListener("mousemove", function(event)
    {
        var x = (2*event.clientX/canvas.width-1) - .03;
        var y = (2*(canvas.height-event.clientY)/canvas.height-1) + .25;
        if (trackingMouse && inDrawMode)
        {
            var point = vec4(x, y);
            controlPoints[selectedCP] = point;
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (cpLocation + selectedCP), flatten(point));
            drawBezierCurves();
            drawSurfaceOfRotation();
        }
        else if (inViewMode && mouseDown)
        {
            if (lastX && lastY)
            {
                if (x > lastX)
                {
                    phi += dr / 3;
                }
                else if (x < lastX)
                {
                    phi -= dr / 3;
                }
                if (y > lastY)
                {
                    theta -= dr / 3;
                }
                else if (y < lastY)
                {
                    theta += dr / 3;
                }
            }
            lastX = x;
            lastY = y;
        }
    });

    render();
}

//rotates a vertex around the Y axis (axis of rotation)
function rotateY(vertex, degrees)
{
    var result;
    var rotMatrix = [vec4(Math.cos(degrees), 0, Math.sin(degrees), 0),
                          vec4(0, 1, 0, 0),
                          vec4(-1* Math.sin(degrees), 0, Math.cos(degrees), 0),
                          vec4(0, 0, 0, 1)];

    var x = vertex[0]*rotMatrix[0][0] + vertex[1]*rotMatrix[0][1] + vertex[2]*rotMatrix[0][2];
    var y = vertex[0]*rotMatrix[1][0] + vertex[1]*rotMatrix[1][1] + vertex[2]*rotMatrix[1][2];
    var z = vertex[0]*rotMatrix[2][0] + vertex[1]*rotMatrix[2][1] + vertex[2]*rotMatrix[2][2];
    result = vec4(x, y, z, 1);
    return result;
}

//determines if mouse is on control point when you click down
function mouseOnPoint(x, y)
{
    var result = false;
    for (var i = 0; i < controlPoints.length; i++)
    {
        if ((x >= controlPoints[i][0] - .05 && x <= controlPoints[i][0] + .05) && (y >= controlPoints[i][1] - .05 && y <= controlPoints[i][1] + .05))
        {
            selectedCP = i;
            result = true;
            return result;
        }
    }
    return result;
}

//create bezier curve vertices or update them inside the ARRAY_BUFFER
function drawBezierCurves()
{
    var count = 0;
    for (var t = 0.0; t <= 1.00; t += .01)
    {
        var xTop = Math.pow((1 - t), 3)*controlPoints[0][0] + 3*Math.pow((1 - t), 2)*t*controlPoints[1][0] + 3*(1 - t)*Math.pow(t, 2)*controlPoints[2][0] + Math.pow(t, 3)*controlPoints[3][0];
        var yTop = Math.pow((1 - t), 3)*controlPoints[0][1] + 3*Math.pow((1 - t), 2)*t*controlPoints[1][1] + 3*(1 - t)*Math.pow(t, 2)*controlPoints[2][1] + Math.pow(t, 3)*controlPoints[3][1];
        var xBottom = Math.pow((1 - t), 3)*controlPoints[3][0] + 3*Math.pow((1 - t), 2)*t*controlPoints[4][0] + 3*(1 - t)*Math.pow(t, 2)*controlPoints[5][0] + Math.pow(t, 3)*controlPoints[6][0];
        var yBottom = Math.pow((1 - t), 3)*controlPoints[3][1] + 3*Math.pow((1 - t), 2)*t*controlPoints[4][1] + 3*(1 - t)*Math.pow(t, 2)*controlPoints[5][1] + Math.pow(t, 3)*controlPoints[6][1];
        if (!bcInitialized)
        {
            bezierCurveTop.push(vec4(xTop, yTop));
            bezierCurveBottom.push(vec4(xBottom, yBottom));  
        }
        else
        {
            var topPoint = vec4(xTop, yTop);
            var bottomPoint = vec4(xBottom, yBottom);
            bezierCurveTop[count] = topPoint;
            bezierCurveBottom[count] = bottomPoint;
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (btLocation + count), flatten(topPoint));
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (bbLocation + count), flatten(bottomPoint));
            count++;
        }
    }
}

//create surface of rotation vertices or update them inside the ARRAY_BUFFER
function drawSurfaceOfRotation()
{
    var TBvertices = [];
    var BBvertices = [];
    var count = 0;
    for (var i = 0.0; i < 360.0; i += steps)
    {
        for (var j = 0; j < bezierCurveTop.length; j++)
        {
            var currTop = rotateY(bezierCurveTop[j], i);
            var currBot = rotateY(bezierCurveBottom[j], i);
            TBvertices.push(currTop);
            BBvertices.push(currBot);
            if (sorInitialized)
            {
                gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (sorLocation + count), flatten(currTop));
                gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (surfaceOfRotation.length/2 + count), flatten(currBot));
                count++;
            }
        }
    }
    surfaceOfRotation = TBvertices.concat(BBvertices);
}

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (inDrawMode)
    {
        eye = vec3(radius*Math.sin(0), radius*Math.sin(0), 
             radius*Math.cos(0));

    
        modelViewMatrix = lookAt( eye, at, up );
        projectionMatrix = ortho( left, right, bottom, ytop, near, far );
    
        gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
        gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

        gl.uniform4fv(fColor, flatten(gray));
        gl.drawArrays(gl.LINE_STRIP, aorLocation, axisOfRotation.length);
        gl.uniform4fv(fColor, flatten(black));
        gl.drawArrays(gl.POINTS, cpLocation, controlPoints.length);
        gl.uniform4fv(fColor, flatten(blue));
        gl.drawArrays(gl.LINE_STRIP, btLocation, bezierCurveTop.length * 2);
        gl.uniform4fv(fColor, flatten(yellow));
        gl.drawArrays(gl.LINE_STRIP, cpLocation, controlPoints.length);
    }
    else if (inViewMode)
    {
        eye = vec3(radius*Math.sin(phi), radius*Math.sin(theta), 
             radius*Math.cos(phi));

    
        modelViewMatrix = lookAt( eye, at, up );
        projectionMatrix = ortho( left, right, bottom, ytop, near, far );
    
        gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
        gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );


        gl.uniform4fv(fColor, flatten(black));
        gl.drawArrays(gl.LINE_STRIP, sorLocation, surfaceOfRotation.length);
    }

    requestAnimFrame(render);
}
