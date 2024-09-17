let isDragging = false;
let startX;
let scrollLeft;

function enableHorizontalDrag(elementId) {
  const element = document.getElementById(elementId);
  
  if (!element) return;

  element.addEventListener('mousedown', startDragging);
  element.addEventListener('mousemove', drag);
  element.addEventListener('mouseup', stopDragging);
  element.addEventListener('mouseleave', stopDragging);
}

function startDragging(e) {
  isDragging = true;
  startX = e.pageX - this.offsetLeft;
  scrollLeft = this.scrollLeft;
}

function drag(e) {
  if (!isDragging) return;
  e.preventDefault();
  const x = e.pageX - this.offsetLeft;
  const walk = (x - startX) * 2; // Ajuste a velocidade do arraste aqui
  this.scrollLeft = scrollLeft - walk;
}

function stopDragging() {
  isDragging = false;
}

// Chame esta função após o componente React ser montado
export function initDragScroll() {
  enableHorizontalDrag('kanban-columns');
}