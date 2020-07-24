/* global AFRAME */
const COLLISION_LAYERS = require("../constants").COLLISION_LAYERS;

AFRAME.registerComponent("sticky-object", {
  schema: { resetScaleWhenGrabbed: { default: true } },

  init() {
    this.currentSnapTarget = null;
    // Used to directly find out which targets are within the scene, is probably not needed with
    // an implementation based on physics system
    const media_loaders = AFRAME.scenes[0].querySelectorAll("[media-loader]");
    this.snapObjects = [];
    for (let i = 0; i < media_loaders.length; i++) {
      // If the object to snap onto has a 3D object
      if (media_loaders[i].object3D != null) {
        // Check if object is of the desired type
        if (media_loaders[i].object3D.name.substring(0, 10).toLowerCase() == "snapobject") {
          this.snapObjects.push(media_loaders[i]);
        }
      }
    }

    this.el.updateComponent("floaty-object", { gravitySpeedLimit: 0 });
    this.initialized = true;
  },
  snapIfPossible() {
    // Check that the object is a video loader.
    if (this.el.getAttribute("media-video") != null) {
      // Check if there are any snap objects in the scene
      const physicsSystem = AFRAME.scenes[0].systems["hubs-systems"].physicsSystem;
      const coll = physicsSystem.getCollisions(this.el.components["body-helper"].uuid);
      if (coll.length > 0) {
        for (let bodyHelperID of coll) {
          const collision_Element = physicsSystem.bodyUuidToData.get(bodyHelperID).object3D.el;
          if (collision_Element.object3D.name.substring(0, 10).toLowerCase() == "snapobject") {
            this.updateSnapTarget(collision_Element);
            this.snap(this, collision_Element);
            this.el.setAttribute("pinnable", { pinned: true });
            this.snapped = true;
          }
        }
      }
      if (coll.length === 0 || !coll.includes(this.currentSnapTarget.components["body-helper"].uuid)) {
        this.clearSnapTarget();
      }
    }
  },
  snap(toSnap, snapOn) {
    // Align rotation
    toSnap.el.object3D.setRotationFromQuaternion(snapOn.object3D.getWorldQuaternion()); //.rotation.copy(snapOn.object3D.);
    // Align position
    toSnap.el.object3D.position.copy(snapOn.object3D.getWorldPosition());
    // Set to same scale
    toSnap.el.object3D.scale.copy(snapOn.object3D.getWorldScale());
    // Move slightly to avoid texture tearing
    toSnap.el.object3D.translateZ(0.002);
    // Make snap target invisible
    this.currentSnapTarget.object3DMap.mesh.material.opacity = 0;
  },
  clearSnapTarget() {
    if (this.currentSnapTarget != 0) {
      this.currentSnapTarget.object3DMap.mesh.material.opacity = 1;
      this.currentSnapTarget = 0;
    }
  },
  updateSnapTarget(closestObject) {
    // Check if closest object already is colored
    if (this.currentSnapTarget != closestObject) {
      // If not, empty list of colored objects, since there should be only one colored object
      if (this.currentSnapTarget != 0) {
        this.currentSnapTarget.object3DMap.mesh.material.opacity = 1;
      }
      // Mark closest object by changing its opacity
      closestObject.object3DMap.mesh.material.opacity = 0.5;
      this.currentSnapTarget = closestObject;
    }
  },
  tick() {
    if (!this.bodyHelper) {
      this.bodyHelper = this.el.components["body-helper"];
    }
    const interaction = AFRAME.scenes[0].systems.interaction;
    const isHeld = interaction && interaction.isHeld(this.el);
    const physicsSystem = AFRAME.scenes[0].systems["hubs-systems"].physicsSystem;
  }
});
