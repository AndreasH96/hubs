/* global AFRAME */
const COLLISION_LAYERS = require("../constants").COLLISION_LAYERS;

AFRAME.registerComponent("sticky-object", {
  schema: { resetScaleWhenGrabbed: { default: true } },

  init() {
    this.currentSnapTarget = null;

    const physicsSystem = this.el.sceneEl.systems["hubs-systems"].physicsSystem;

    this.el.updateComponent("body-helper", {
      gravity: { x: 0, y: 0, z: 0 },
      collisionFilterMask: COLLISION_LAYERS.UNOWNED_INTERACTABLE,
      collisionFilterGroup: COLLISION_LAYERS.UNOWNED_INTERACTABLE,
      disableCollision: true
    });
    physicsSystem.activateBody(this.el.components["body-helper"].uuid);
    this.el.updateComponent("floaty-object", { gravitySpeedLimit: 0, autoLockOnRelease: true });
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
      if (
        coll.length === 0 ||
        this.currentSnapTarget == null ||
        !coll.includes(this.currentSnapTarget.components["body-helper"].uuid)
      ) {
        this.clearSnapTarget();
      }
    }
  },
  setLocked(locked) {
    if (this.el.components.networked && !NAF.utils.isMine(this.el)) return;

    this.locked = locked;
    this.el.setAttribute("body-helper", { type: locked ? "kinematic" : "dynamic" });
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
    if (this.currentSnapTarget != null) {
      this.currentSnapTarget.object3DMap.mesh.material.opacity = 1;
      this.currentSnapTarget = null;
    }
  },
  updateSnapTarget(closestObject) {
    // Check if closest object already is colored
    if (this.currentSnapTarget != closestObject) {
      // If not, empty list of colored objects, since there should be only one colored object
      if (this.currentSnapTarget != null) {
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

    const collisions = physicsSystem.getCollisions(this.bodyHelper.uuid);
    if (collisions.length > 0) {
      for (let bodyHelperID of collisions) {
        const collision_Element = physicsSystem.bodyUuidToData.get(bodyHelperID).object3D.el;
        if (collision_Element.object3D.name.substring(0, 10).toLowerCase() == "snapobject") {
          this.updateSnapTarget(collision_Element);
        }
      }
    }
    if (
      collisions.length === 0 ||
      this.currentSnapTarget == null ||
      !collisions.includes(this.currentSnapTarget.components["body-helper"].uuid)
    ) {
      this.clearSnapTarget();
    }

    if (isHeld && !this.wasHeld) {
      this.snapped = false;
      this.clearSnapTarget();

      if (this.data.resetScaleWhenGrabbed) this.el.object3D.scale.set(1, 1, 1);
    }

    if (this.wasHeld && !isHeld) {
      this.snapIfPossible();
      this.setLocked(true);
    }

    this.wasHeld = isHeld;
  },

  remove() {
    if (this.snapped) {
      this.clearSnapTarget();
      this.snapped = false;
    }
  }
});
