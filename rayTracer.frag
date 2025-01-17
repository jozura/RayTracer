// Tampere University
// TIE-52306 Computer Graphics Coding Assignment


#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define FOV PI/6.
#define EPSILON 0.00001
#define REFLECTIONS 2	

// These definitions are tweakable.

/* Minimum distance a ray must travel. Raising this value yields some performance
 * benefits for secondary rays at the cost of weird artefacts around object
 * edges.
 */
#define MIN_DIST 0.08
/* Maximum distance a ray can travel. Changing it has little to no performance
 * benefit for indoor scenes, but useful when there is nothing for the ray
 * to intersect with (such as the sky in outdoors scenes).
 */
#define MAX_DIST 20.0
/* Maximum number of steps the ray can march. High values make the image more
 * correct around object edges at the cost of performance, lower values cause
 * weird black hole-ish bending artefacts but is faster.
 */
#define MARCH_MAX_STEPS 128
/* Typically, this doesn't have to be changed. Lower values cause worse
 * performance, but make the tracing stabler around slightly incorrect distance
 * functions.
 * The current value merely helps with rounding errors.
 */
#define STEP_RATIO 0.999
/* Determines what distance is considered close enough to count as an
 * intersection. Lower values are more correct but require more steps to reach
 * the surface
 */
#define HIT_RATIO 0.001

// Resolution of the screen
uniform vec2 u_resolution;

// Mouse coordinates
uniform vec2 u_mouse;

// Time since startup, in seconds
uniform float u_time;

// Camera origin
//uniform vec3 u_origin;

// Camera lookat direction
//uniform vec3 u_lookat;

// Camera right direction
//uniform vec3 u_right;

// Camera up direction
//uniform vec3 u_up;

struct material
{
    // The color of the surface
    vec4 color;
    bool reflective;
    // You can add your own material features here!
};

// Good resource for finding more building blocks for distance functions:
// http://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm

vec3 aroundAxisRotation(float angle, vec3 axis, vec3 vec)
{
    axis = normalize(axis);
    return vec*cos(angle) + (dot(vec,axis)*axis*(1.0-cos(angle))) + (cross(axis,vec)*sin(angle));
}


/* Basic box distance field.
 *
 * Parameters:
 *  p   Point for which to evaluate the distance field
 *  b   "Radius" of the box
 *
 * Returns:
 *  Distance to the box from point p.
 */
float box(vec3 p, vec3 b)
{
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}



/* Rotates point around origin along the X axis.
 *
 * Parameters:
 *  p   The point to rotate
 *  a   The angle in radians
 *
 * Returns:
 *  The rotated point.
 */
vec3 rot_x(vec3 p, float a)
{
    float s = sin(a);
    float c = cos(a);
    return vec3(
        p.x,
        c*p.y-s*p.z,
        s*p.y+c*p.z
    );
}

/* Rotates point around origin along the Y axis.
 *
 * Parameters:
 *  p   The point to rotate
 *  a   The angle in radians
 *
 * Returns:
 *  The rotated point.
 */
vec3 rot_y(vec3 p, float a)
{
    float s = sin(a);
    float c = cos(a);
    return vec3(
        c*p.x+s*p.z,
        p.y,
        -s*p.x+c*p.z
    );
}

/* Rotates point around origin along the Z axis.
 *
 * Parameters:
 *  p   The point to rotate
 *  a   The angle in radians
 *
 * Returns:
 *  The rotated point.
 */
vec3 rot_z(vec3 p, float a)
{
    float s = sin(a);
    float c = cos(a);
    return vec3(
        c*p.x-s*p.y,
        s*p.x+c*p.y,
        p.z
    );
}

/* Each object has a distance function and a material function. The distance
 * function evaluates the distance field of the object at a given point, and
 * the material function determines the surface material at a point.
 */


 
float torus( vec3 p )
{
  vec3 s = p;
  vec2 t = vec2(1.2,0.1);
  vec2 q = vec2(length(s.xz)-t.x,s.y);
  return length(q)-t.y;
}
 
float torus_distance( vec3 p)
{
  vec3 rot = rot_z(p-vec3(-0.5, -2.2 + abs(sin(u_time)*2.), 2.), u_time);
  return torus(rot);
}

float torus_distance1( vec3 p)
{
  vec3 axis = rot_z(vec3(0,1,0),u_time);
  vec3 rot = p-vec3(-0.5, -2.2 + abs(sin(u_time)*2.), 2.);
  return torus(aroundAxisRotation(u_time,axis,rot));
}

material torus_material(vec3 p){
	material mat;
	mat.color = vec4(1.0, 0.0, 0.3, 1.0);
	mat.reflective = false;
	return mat;
}

float blob_distance(vec3 p)
{
    vec3 q = p - vec3(-0.5, -2.2 + abs(sin(u_time)*2.), 2.0);
    return length(q) - 0.8 + sin(10.0*q.x)*sin(10.0*q.y)*sin(10.0*q.z)*0.07;
}

material blob_material(vec3 p)
{
    material mat;
    mat.reflective = false;
    mat.color = vec4(1.0, 0.5, 0.3, 0.0);
    return mat;
}

float sphere_distance(vec3 p)
{
    return length(p - vec3(1.5, -1.8, 4.0)) - 1.2;
}

material sphere_material(vec3 p)
{
    material mat;
    mat.reflective = true;
    mat.color = vec4(0.1, 0.2, 0.0, 1.0);
    return mat;
}

float room_distance(vec3 p)
{
    return max(
        -box(p-vec3(0.0,3.0,3.0), vec3(0.5, 0.5, 0.5)),
        -box(p-vec3(0.0,0.0,0.0), vec3(8.0, 3.0, 6.0))
    );
}

vec3 opCheapBend( vec3 p )
{
    float k = cos(u_time)*.4; // or some other amount
    float c = cos(k*p.x);
    float s = sin(k*p.x);
    mat2  m = mat2(c,-s,s,c);
    vec3  q = vec3(m*p.xy,p.z);
    return q;
}

float box_distance(vec3 p)
{
	p = opCheapBend(p);
	return box(rot_z(p-vec3(0.0,0.0,-6.999999),u_time), vec3(1.0, 3., 1.0));
}


material room_material(vec3 p)
{
    material mat;
    mat.reflective = false;
    mat.color = vec4(1.0, 1.0, 1.0, 1.0);
    if(p.x <= -7.98) mat.color.rgb = vec3(1.0, 0.0, 0.0);
    else if(p.x >= 7.98) mat.color.rgb = vec3(0.0, 1.0, 0.0);
    return mat;
}

float crate_distance(vec3 p)
{
    return box(rot_y(p-vec3(-1,-1,5), u_time), vec3(1, 2, 1));
}

material crate_material(vec3 p)
{
    material mat;
    mat.reflective = false;
    mat.color = vec4(1.0, 1.0, 1.0, 1.0);

    vec3 q = rot_y(p-vec3(-1,-1,5), u_time) * 0.98;
    if(fract(q.x + floor(q.y*2.0) * 0.5 + floor(q.z*2.0) * 0.5) < 0.5)
    {
        mat.color.rgb = vec3(0.0, 1.0, 1.0);
    }
    return mat;
}

/* The distance function collecting all others.
 *
 * Parameters:
 *  p   The point for which to find the nearest surface
 *  mat The material of the nearest surface
 *
 * Returns:
 *  The distance to the nearest surface.
 */
float map(
    in vec3 p,
    out material mat
){
    float min_dist = MAX_DIST*2.0;
    float dist = 0.0;

    dist = blob_distance(p);
    if(dist < min_dist) {
	    mat = blob_material(p);
        min_dist = dist;
    }

    dist = room_distance(p);
    if(dist < min_dist) {
        mat = room_material(p);
        min_dist = dist;
    }

    dist = crate_distance(p);
    if(dist < min_dist) {
        mat = crate_material(p);
        min_dist = dist;
    }

    dist = sphere_distance(p);
    if(dist < min_dist) {
        mat = sphere_material(p);
        min_dist = dist;
    }

    // Add your own objects here!
	dist = torus_distance(p);
    if(dist < min_dist) {
        mat = torus_material(p);
        min_dist = dist;
    }
	dist = torus_distance1(p);
    if(dist < min_dist) {
        mat = torus_material(p);
        min_dist = dist;
    }
	
	dist = box_distance(p);
	if(dist < min_dist) {
        mat = sphere_material(p);
        min_dist = dist;
	}
    return min_dist;
}

/* Calculates the normal of the surface closest to point p.
 *
 * Parameters:
 *  p   The point where the normal should be calculated
 *  mat The material information, produced as a byproduct
 *
 * Returns:
 *  The normal of the surface.
 *
 * See http://www.iquilezles.org/www/articles/normalsSDF/normalsSDF.htm if
 * you're interested in how this works.
 */
vec3 normal(vec3 p, out material mat)
{
    const vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * map(p + k.xyy * EPSILON, mat) +
        k.yyx * map(p + k.yyx * EPSILON, mat) +
        k.yxy * map(p + k.yxy * EPSILON, mat) +
        k.xxx * map(p + k.xxx * EPSILON, mat)
    );
}

/* Finds the closest intersection of the ray with the scene.
 *
 * Parameters:
 *  o           Origin of the ray
 *  v           Direction of the ray
 *  max_dist    Maximum distance the ray can travel. Usually MAX_DIST.
 *  p           Location of the intersection
 *  n           Normal of the surface at the intersection point
 *  mat         Material of the intersected surface
 *  inside      Whether we are marching inside an object or not. Useful for
 *              refractions.
 *
 * Returns:
 *  true if a surface was hit, false otherwise.
 */
bool intersect(
    in vec3 o,
    in vec3 v,
    in float max_dist,
    out vec3 p,
    out vec3 n,
    out material mat,
    bool inside
) {
    float t = MIN_DIST;
    float dir = inside ? -1.0 : 1.0;
    bool hit = false;

    for(int i = 0; i < MARCH_MAX_STEPS; ++i)
    {
        p = o + t * v;
        float dist = dir * map(p, mat);
        
        hit = abs(dist) < HIT_RATIO * t;

        if(hit || t > max_dist) break;

        t += dist * STEP_RATIO;
    }

    n = normal(p, mat);

    return hit;
}

vec3 phong(vec3 n, vec3 light_pos, vec3 light_color, vec3 frag_pos, vec3 view_pos){
	// ambient
    float ambientStrength = 0.1;
    vec3 ambient = ambientStrength * light_color;
  	
    // diffuse 
    vec3 norm = normalize(n);
    vec3 light_dir = normalize(light_pos - frag_pos);
    float diff = max(dot(norm, light_dir), 0.0);
    vec3 diffuse = diff * light_color;
    
    // specular
    float specular_strength = 0.5;
    vec3 viewDir = normalize(view_pos - frag_pos);
    vec3 reflect_dir = reflect(-light_dir, norm);  
    float spec = pow(max(dot(viewDir, reflect_dir), 0.0), 32.0);
    vec3 specular = specular_strength * spec * light_color;  
        
    return (ambient + diffuse + specular);
}



/* Calculates the color of the pixel, based on view ray origin and direction.
 *
 * Parameters:
 *  o   Origin of the view ray
 *  v   Direction of the view ray
 *
 * Returns:
 *  Color of the pixel.
 */
vec3 render(vec3 o, vec3 v)
{
    // This lamp is positioned at the hole in the roof.
    vec3 lamp_pos = vec3(0.0, 2.9, 3.0);
    vec3 lamp_color = vec3(255,255,255);
	float intensity = 0.01;
	lamp_color = lamp_color*intensity;
	
    vec3 p, n;
    material mat;

    // Compute intersection point along the view ray.
    intersect(o, v, MAX_DIST, p, n, mat, false);
    
    
    vec3 obj_color = mat.color.rgb*phong(n, lamp_pos, lamp_color,p,o);
    
	if (mat.reflective && (REFLECTIONS > 0)) 
	{
		vec3 ref = reflect(v,n);
		material refl_mat;
		intersect(p + n*0.01, ref, MAX_DIST, p,n, refl_mat, false);
		for (int i = 0; i < REFLECTIONS - 1; ++i) {
			if(!refl_mat.reflective){
				break;
			}
			ref = reflect(ref,n);
			intersect(p + n*0.01, ref, MAX_DIST, p,n, refl_mat, false);
		}
		obj_color = 0.8*refl_mat.color.rgb*phong(n, lamp_pos, lamp_color,p,o);
		
	}
	vec3 fragToLamp = normalize(lamp_pos-p);
	float distanceFromFragToLamp = length(p - lamp_pos);
	if(intersect(p + 0.01*n, fragToLamp, distanceFromFragToLamp, p, n, mat, false)){
		return obj_color*0.2;
	} else {
		return obj_color;
	}
}

vec3 u_up = vec3(0,1,0);
vec3 u_origin = vec3(0,0,0);
vec3 u_right = vec3(1,0,0);
vec3 u_lookat = vec3(0,0,-1);


void main()
{
    // This is the position of the pixel in normalized device coordinates.
    vec2 uv = ((gl_FragCoord.xy+0.5)/u_resolution)*2.0-1.0;
    vec2 mouse = ((u_mouse.xy+0.5)/u_resolution)*2.0-1.0;
    // Calculate aspect ratio
    float aspect = u_resolution.x/u_resolution.y;
	float h = atan(FOV);
    float w = h*aspect;
	
    vec3 up = u_up;
    vec3 lookat = u_lookat;
	vec3 right = u_right;
    vec3 o = u_origin;
    vec3 v = normalize(lookat + w*right*uv.x + h*up*uv.y);

    gl_FragColor = vec4(render(o, v), 1.0);
}