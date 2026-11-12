using System.Collections.Generic;
using Godot;

namespace Touchdown;

/// <summary>
/// A throttle lever on the cabin wall. Whoever stands at it can push it up or down with their own keys. It stays where
/// it's left, so one crew member can set it and run to the other lever.
/// </summary>
public partial class Lever : Area2D
{
	/// <summary>Emitted whenever the throttle moves. The HUD could listen to this (it polls for now).</summary>
	[Signal] public delegate void ThrottleChangedEventHandler(float throttle);

	/// <summary>Shown on the lever: "L" or "R".</summary>
	[Export] public string Label = "L";
	/// <summary>How fast the lever moves while held, in full throws per second.</summary>
	[Export] public float Rate = 0.6f;

	/// <summary>0 is off, 1 is full power.</summary>
	public float Throttle { get; set; }

	/// <summary>The crew members standing at this lever right now. Usually one, sometimes both, often none.</summary>
	readonly List<Crew> _inReach = new();

	public override void _Ready()
	{
		BodyEntered += OnBodyEntered;
		BodyExited += OnBodyExited;
	}

	// YOU 2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
	/// <summary>
	/// Keep track of who is standing at this lever.
	///
	/// - This Area2D's collision mask is set to the "crew" layer, so only crew can trigger it.
	/// - Still check <c>body is Crew crew</c>: it's a good habit, and it gives you the crew member to remember.
	/// - Add them to <c>_inReach</c> here, and remove them in <see cref="OnBodyExited"/>.
	///
	/// Read: Unit 4 ("Using signals") and "Using Area2D" from Unit 3.
	/// </summary>
	void OnBodyEntered(Node2D body)
	{
		// YOU: write this.
	}

	void OnBodyExited(Node2D body)
	{
		// YOU: write this.
	}

	/// <summary>
	/// For each crew member in reach, their own lever keys move the throttle at <see cref="Rate"/>:
	/// <c>Input.GetAxis(crew.Action("lever_down"), crew.Action("lever_up"))</c>. If both stand here and you push
	/// opposite ways, they fight over it. Keep it between 0 and 1 (<c>Mathf.Clamp</c>), and emit ThrottleChanged when
	/// it moves.
	/// </summary>
	public override void _PhysicsProcess(double delta)
	{
		// YOU: write this.

		QueueRedraw();
	}

	// Placeholder art: a slot with a handle. The handle rises with the throttle, and glows when someone can reach it.
	public override void _Draw()
	{
		var slot = new Rect2(-3, -30, 6, 34);
		DrawRect(slot, new Color(0.05f, 0.05f, 0.06f));
		DrawRect(new Rect2(-3, 4 - 34 * Throttle, 6, 34 * Throttle), new Color(1f, 0.55f, 0.15f, 0.7f));
		float y = 4 - 34 * Throttle;
		var knob = _inReach.Count > 0 ? new Color(1f, 0.85f, 0.3f) : new Color(0.75f, 0.75f, 0.78f);
		DrawRect(new Rect2(-7, y - 3, 14, 6), knob);
		DrawString(ThemeDB.FallbackFont, new Vector2(-4, -36), Label, HorizontalAlignment.Left, -1, 10,
			new Color(0.8f, 0.8f, 0.85f));
	}
}
