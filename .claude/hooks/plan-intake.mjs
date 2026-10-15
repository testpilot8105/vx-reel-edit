// Runs on every prompt. In plan mode it tells Claude to run the /vx-edit-video intake before planning an edit, so the
// "think like an editor" questions are asked even if the instruction in CLAUDE.md is missed. Outside plan mode it is
// silent. Reads the hook input from stdin; anything it prints is added to the prompt's context.
let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    process.exit(0);
  }
  if (input.permission_mode !== 'plan') process.exit(0);
  process.stdout.write(
    [
      'VX Reel Edit, plan mode: if this prompt is about editing a video (new footage, a re-edit, notes on a draft), follow /vx-edit-video.',
      'Before writing any plan, run its intake through AskUserQuestion (references/intake.md): round 1 this video, round 2 the look,',
      "round 3 layers, round 4 pegs, the style profile's current answers first and marked Recommended. Facts the footage answers are not asked.",
      'Then the plan is the edit plan (beats.md shape: message, three hooks, beats table, cuts, length). Approving it approves the edit.',
    ].join(' '),
  );
});
