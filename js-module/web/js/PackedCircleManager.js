/**
	  ####  #####  ##### ####    ###  #   # ###### ###### ##     ##  #####  #     #      ########    ##    #  #  #####
	 #   # #   #  ###   #   #  #####  ###    ##     ##   ##  #  ##    #    #     #     #   ##   #  #####  ###   ###
	 ###  #   #  ##### ####   #   #   #   ######   ##   #########  #####  ##### ##### #   ##   #  #   #  #   # #####
 �
 File:
 	PackedCircleManager.js
 Created By:
 	Mario Gonzalez
 Project	:
 	None
 Abstract:
 	Manages a set of packed circles.
 Basic Usage:
	http://onedayitwillmake.com/CirclePackJS/
*/
var init = (function()
{
	/*
	 *	PackedCircleManager
	 */
	PackedCircleManager = function()
	{
		this.allCircles = [];
		this.center = new Vector(0,0);
		this.bounds = {left:0, top:0, right:0, bottom:0};

		// Number of passes for the centering and collision algorithms - it's (O)logN^2 so use increase at your own risk!
		// Play with these numbers - see what works best for your project
		this.numberOfCenteringPasses = 1;
		this.numberOfCollisionPasses = 2;
	};


	/**
	 * Set the boundary rectangle for the circle packing.
	 * This is used to locate the 'center'
	 * @param aBoundaryObject
	 */
	PackedCircleManager.prototype.setBounds = function (aBoundaryObject)
	{
		this.bounds = aBoundaryObject;
		console.log(aBoundaryObject);
		this.center = new Vector(aBoundaryObject.right/2, aBoundaryObject.bottom/2);
		console.log( aBoundaryObject.bottom);
	};

	/**
	 * Add a circle
	 * @param aCircle A Circle to add, should already be created.
	 */
	PackedCircleManager.prototype.addCircle = function(aCircle)
	{
		this.allCircles.push(aCircle);
		aCircle.targetPosition = this.center.cp();
		//this.allCircles.setObjectForKey(aCircle, this.allCircles.count());
	};

	/**
	 * Place all circles randomly within the boundary
	 */
	PackedCircleManager.prototype.randomizeCirclePositions = function()
	{
		for(var i = 0; i < this.allCircles.length; i++)
		{
			var ci = this.allCircles[i];
			var randomPosition = new Vector(0,0);
			randomPosition.x = this.randRange(this.bounds.left, this.bounds.right);
			randomPosition.y = this.randRange(this.bounds.top, this.bounds.bottom);
			ci.setPosition(randomPosition);
		}
	};

	/**
	 * Packs the circles towards the center of the bounds.
	 * Each circle will have it's own 'targetPosition' later on
	 */
	PackedCircleManager.prototype.packCircles = function()
	{
		var v = new Vector(0, 0);

		var dragCircle = this.draggedCircle; // ignore for now
		var circleList = this.allCircles;
		circleList.sort(this.sortOnDistanceToCenter);

		var len = circleList.length;


		// push toward center
		for(n = 0; n < this.numberOfCenteringPasses; n++)
		{
			var damping = 0.02;
			for(i = 0; i < len; i++)
			{
				var c = circleList[i];

				if(c == dragCircle) continue;

				v.x = c.position.x - this.center.x;
				v.y = c.position.y - this.center.y;
				v.mul(damping);
				c.position.x -= v.x;
				c.position.y -= v.y;
			}
		}

		// Collide circles
		for(var n = 0; n < this.numberOfCollisionPasses; n++)
		{
			for(var i = 0; i < len; i++)
			{
				var ci = circleList[i];
				ci.previousPosition.x = ci.position.x;
				ci.previousPosition.y = ci.position.y;

				for (var j = i + 1; j< len; j++)
				{
					var cj = circleList[j];
					if(ci == cj) continue;   // It's us!

					var dx = cj.position.x - ci.position.x;
					var dy = cj.position.y - ci.position.y;
					var r = ci.radius + cj.radius;

					var d = ci.position.distanceSquared(cj.position);

					if (d < (r * r) - 0.01 )
					{
						v.x = dx;
						v.y = dy;
						v.normalize();

						var inverseForce = (r - Math.sqrt(d)) * 0.5;
						v.mul(inverseForce);

						if(cj != dragCircle)
						{
							if(ci == dragCircle) v.mul(2); // Double inverse force to make up for the fact that the other object is fixed

							cj.position.x += v.x;
							cj.position.y += v.y;
						}

						if (ci != dragCircle)
						{
							if(cj == dragCircle) v.mul(2);  // Double inverse force to make up for the fact that the other object is fixed

							ci.position.x -= v.x;
							ci.position.y -= v.y;
						}
					}
				}
			}
		}

	};

	/**
	 * Returns the comaprison result for two circles based on their distance from their target location
	 * @param circleA
	 * @param circleB
	 */
	PackedCircleManager.prototype.sortOnDistanceToCenter = function(circleA, circleB)
	{
		var valueA = circleA.distanceSquaredFromTargetPosition();
		var valueB = circleB.distanceSquaredFromTargetPosition();
		var comparisonResult = 0;

		if(valueA > valueB) comparisonResult = -1;
		else if(valueA < valueB) comparisonResult = 1;

		return comparisonResult;
	};

	/**
	 * Force a certain circle to be the 'draggedCircle'.
	 * Can be used to undrag a circle by calling setDraggedCircle(null)
	 * @param aCircle  Circle to start dragging. It's assumed to be part of our list. No checks in place currently.
	 */
	PackedCircleManager.prototype.setDraggedCircle = function(aCircle)
	{
		this.draggedCircle = aCircle;
	};

	/**
	 * Given an x,y position finds circle underneath and sets it to the currently grabbed circle
	 * @param xpos
	 * @param ypos
	 */
	PackedCircleManager.prototype.grabCircleAt = function(xpos, ypos)
	{
		var circleList = this.allCircles;
		var len = circleList.length;
		var grabVector = new Vector(xpos, ypos);

		// These are set every time a better match i found
		var closestCircle = undefined;
		var closestDistance = Number.MAX_VALUE; // i could really just use 999 but i look cool

		// Loop thru and find the closest match
		for(var i = 0; i < len; i++)
		{
			var aCircle = circleList[i];
			var distanceSquared = aCircle.position.distanceSquared(grabVector);

//			console.log(distanceSquared < aCircle.radiusSquared);
			if(distanceSquared < closestDistance && distanceSquared < aCircle.radiusSquared)
			{
				closestDistance = distanceSquared;
				closestCircle = aCircle;
			}
		}

		if(closestCircle == undefined) return;
		this.draggedCircle = closestCircle;

		return closestCircle;
	};

	/**
	 * Helper functions
	 */
	PackedCircleManager.prototype.randRange = function(min, max)
	{
		return Math.random() * (max-min) + min;
	};

	return PackedCircleManager;
})();