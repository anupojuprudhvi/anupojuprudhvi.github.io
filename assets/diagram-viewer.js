/* Progressive enhancement: original diagrams remain readable without JavaScript. */
(() => {
  if (typeof HTMLDialogElement === 'undefined') return;
  const figures = document.querySelectorAll('.orbital-scene, figure.flow, figure.wide-block, figure.reqflow');
  if (!figures.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'diagram-viewer';
  dialog.setAttribute('aria-labelledby', 'diagramTitle');
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'diagramTitle';
  title.textContent = 'Architecture diagram';
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'diagram-expand'; close.textContent = 'Close';
  const content = document.createElement('div');
  content.className = 'diagram-content'; content.tabIndex = 0;
  content.setAttribute('aria-label', 'Enlarged diagram; scroll to see all content');
  header.append(title, close); dialog.append(header, content); document.body.append(dialog);
  let opener;
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { content.replaceChildren(); opener?.focus({preventScroll:true}); });
  figures.forEach(figure => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'diagram-expand'; button.textContent = 'Enlarge diagram';
    button.setAttribute('aria-haspopup', 'dialog');
    figure.after(button);
    button.addEventListener('click', () => {
      opener = button;
      title.textContent = figure.querySelector('figcaption')?.textContent.trim() || 'Cloud platform architecture';
      const copy = figure.cloneNode(true);
      copy.removeAttribute('id'); copy.removeAttribute('aria-hidden');
      copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      copy.querySelectorAll('button, .flow-controls, .flow-player, .flow-status').forEach(el => el.remove());
      copy.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls]').forEach(el => {
        el.removeAttribute('aria-labelledby'); el.removeAttribute('aria-describedby'); el.removeAttribute('aria-controls');
      });
      content.replaceChildren(copy); dialog.showModal(); close.focus();
    });
  });
})();
