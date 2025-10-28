window.onload = function () {
  if (typeof THREE === 'undefined') {
    console.error("Three.js not loaded. Cannot start 3D animation.");
    return;
  }

  const canvas = document.getElementById('threejs-canvas');
  let scene, camera, renderer;
  let vehicles = [];

  const primaryColor = 0x00cc55;
  const secondaryColor = 0x0066CC;
  const wheelColor = 0x666666;
  const windowColor = 0xe0e0e0;
  const specularColor = 0x10b981;

  const createBus = () => {
    const busGroup = new THREE.Group();
    const busMaterial = new THREE.MeshPhongMaterial({
      color: primaryColor,
      shininess: 50,
      specular: specularColor,
      flatShading: true
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.2), busMaterial);
    busGroup.add(body);

    const windowMaterial = new THREE.MeshBasicMaterial({ color: windowColor });
    const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.0), windowMaterial);
    windscreen.position.set(1.5, 0.2, 0);
    busGroup.add(windscreen);

    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: wheelColor, flatShading: true });
    const wheelPositions = [
      { x: 1, z: 0.6 }, { x: 1, z: -0.6 },
      { x: -1, z: 0.6 }, { x: -1, z: -0.6 }
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, -0.5, pos.z);
      busGroup.add(wheel);
    });

    return busGroup;
  };

  const createVan = () => {
    const vanGroup = new THREE.Group();
    const vanMaterial = new THREE.MeshPhongMaterial({
      color: secondaryColor,
      shininess: 40,
      flatShading: true
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.2), vanMaterial);
    vanGroup.add(body);

    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 8);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: wheelColor, flatShading: true });
    const wheelPositions = [
      { x: 0.7, z: 0.6 }, { x: 0.7, z: -0.6 },
      { x: -0.7, z: 0.6 }, { x: -0.7, z: -0.6 }
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, -0.5, pos.z);
      vanGroup.add(wheel);
    });

    return vanGroup;
  };

  const init = () => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 10;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const directionalLight = new THREE.DirectionalLight(primaryColor, 1.2);
    directionalLight.position.set(5, 5, 5).normalize();
    scene.add(directionalLight);

    const vehiclesData = [
      { type: 'bus', x: -8, y: 3, z: 0, speed: 0.01 },
      { type: 'bus', x: -15, y: -4, z: 3, speed: 0.012 },
      { type: 'bus', x: 0, y: 1, z: 1, speed: 0.009 },
      { type: 'bus', x: -20, y: 4, z: -4, speed: 0.005 },
      { type: 'van', x: 10, y: -1, z: -2, speed: -0.018 },
      { type: 'van', x: -12, y: 1, z: -3, speed: 0.015 },
      { type: 'van', x: 2, y: -2, z: 1, speed: -0.009 },
      { type: 'van', x: 15, y: 0, z: 2, speed: -0.014 }
    ];

    vehicles = vehiclesData.map(data => {
      const vehicle = data.type === 'bus' ? createBus() : createVan();
      vehicle.position.set(data.x, data.y, data.z);
      vehicle.userData.speed = data.speed;
      scene.add(vehicle);
      return vehicle;
    });

    window.addEventListener('resize', onWindowResize, false);
    animate();
  };

  const onWindowResize = () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  };

  const animate = () => {
    requestAnimationFrame(animate);
    vehicles.forEach(vehicle => {
      vehicle.position.x += vehicle.userData.speed;
      vehicle.rotation.y += 0.003;

      const loopBoundary = 15;
      if (vehicle.userData.speed > 0 && vehicle.position.x > loopBoundary) {
        vehicle.position.x = -loopBoundary;
      } else if (vehicle.userData.speed < 0 && vehicle.position.x < -loopBoundary) {
        vehicle.position.x = loopBoundary;
      }
    });
    renderer.render(scene, camera);
  };

  init();
};
