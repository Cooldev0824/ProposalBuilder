<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import DraggableResizableVue from 'draggable-resizable-vue3'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Checklist from '@editorjs/checklist'
import Quote from '@editorjs/quote'
import Code from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import Table from '@editorjs/table'
import Image from '@editorjs/image'
import LinkTool from '@editorjs/link';
import Embed from '@editorjs/embed';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';
import Warning from '@editorjs/warning';
import Underline from '@editorjs/underline';
import Paragraph from '@editorjs/paragraph'
import html2pdf from 'html2pdf.js';
import EditorRuler from './editor_ruler.vue';
import AlignmentTuneTool from 'editorjs-text-alignment-blocktune';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  zoom: {
    type: Number,
    default: 100
  },
  action: {
    type: String,
    default: null
  },
  readonly: {
    type: Boolean,
    default: false
  },
  background: {
    type: String,
    default: ''
  },
  showGrid: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);
const documentPage = ref(null);
const textBlocks = ref([]); // Move this declaration up
const editors = ref(new Map());
const isSelecting = ref(false);
const containerWidth = ref(0);
const containerHeight = ref(0);
const mousePosition = ref({ x: 0, y: 0 });
const selectionArea = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});
const startX = ref(0);
const startY = ref(0);
const selectedBlockId = ref(null);
const editMode = ref(false); // Track whether we're in edit mode or move mode
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuBlockId = ref(null);
const editorHasFocus = ref(false); // Track if the editor has focus

// Now add the watch after all refs are declared
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue.length > 0) {
    // Clear existing blocks
    textBlocks.value = [];

    // Create new blocks from the loaded content
    newValue.forEach(block => {
      const newBlock = {
        id: block.id,
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        content: block.content
      };

      textBlocks.value.push(newBlock);

      // Create editor after Vue updates the DOM
      nextTick(() => {
        const editor = createEditor(newBlock.id);
        // Set the content for this editor
        if (editor) {
          editor.isReady.then(() => {
            editor.render(block.content);
          });
        }
      });
    });
  }
}, { immediate: true });

const createEditor = (blockId) => {
  // Create a wrapper div to capture and stop events from propagating to the container
  const editorWrapper = document.getElementById(`editor-${blockId}`);

  // Fix for continuous backspace deletion
  const setupBackspaceRepeat = (element) => {
    if (!element) return;

    // Variables to track key state
    // let backspaceInterval = null;
    // let backspaceTimeout = null;

    // Add event listeners for keydown and keyup
    // element.addEventListener('keydown', (e) => {
    //   // If backspace key is pressed
    //   if (e.key === 'Backspace') {
    //     // Clear any existing interval/timeout
    //     clearInterval(backspaceInterval);
    //     clearTimeout(backspaceTimeout);

    //     // Set a timeout before starting continuous deletion
    //     // backspaceTimeout = setTimeout(() => {
    //     //   // Start an interval to continuously trigger backspace
    //     //   backspaceInterval = setInterval(() => {
    //     //     // Create a new backspace key event
    //     //     const backspaceEvent = new KeyboardEvent('keydown', {
    //     //       key: 'Backspace',
    //     //       code: 'Backspace',
    //     //       keyCode: 8,
    //     //       which: 8,
    //     //       bubbles: true,
    //     //       cancelable: true
    //     //     });

    //     //     // Dispatch the event to the active element
    //     //     document.activeElement.dispatchEvent(backspaceEvent);
    //     //   }, 50); // Repeat every 50ms
    //     // }, 500); // Start after 500ms of holding
    //   }
    // });

    // Stop the interval when key is released
    // element.addEventListener('keyup', (e) => {
    //   if (e.key === 'Backspace') {
    //     clearInterval(backspaceInterval);
    //     clearTimeout(backspaceTimeout);
    //   }
    // });
  };

  // Apply the backspace fix after editor is ready
  // setTimeout(() => {
  //   if (editorWrapper) {
  //     setupBackspaceRepeat(editorWrapper);
  //   }
  // }, 500);

  const editor = new EditorJS({
    holder: `editor-${blockId}`,
    tools: {
      header: {
        class: Header,
        inlineToolbar: true,
        config: {
          levels: [1, 2, 3, 4, 5, 6],
          defaultLevel: 3
        },
        tunes: ['alignmentTune'],
      },
      paragraph: {
        class: Paragraph,
        inlineToolbar: true,
        tunes: ['alignmentTune'],
      },
      list: {
        class: List,
        inlineToolbar: true,
        tunes: ['alignmentTune'],
      },
      checklist: {
        class: Checklist,
        inlineToolbar: true,
        tunes: ['alignmentTune'],
      },
      quote: {
        class: Quote,
        inlineToolbar: true,
        config: {
          quotePlaceholder: 'Enter a quote',
          captionPlaceholder: 'Quote\'s author',
        },
        tunes: ['alignmentTune'],
      },
      code: {
        class: Code,
        tunes: ['alignmentTune'],
      },
      delimiter: {
        class: Delimiter,
      },
      table: {
        class: Table,
        inlineToolbar: true,
        config: {
          rows: 2,
          cols: 3,
        },
        tunes: ['alignmentTune'],
      },
      image: {
        class: Image,
        config: {
          endpoints: {
            byFile: 'http://localhost:8080/uploadFile',
            byUrl: 'http://localhost:8080/fetchUrl',
          }
        }
      },
      // Add the alignment tune tool
      alignmentTune: {
        class: AlignmentTuneTool,
        config: {
          default: "left",
          blocks: {
            header: 'left',
            list: 'left',
            paragraph: 'left'
          }
        }
      }
    },
    linkTool: {
      class: LinkTool,
      config: {
        endpoint: '/fetchUrl'
      }
    },
    embed: {
      class: Embed,
      config: {
        services: {
          youtube: true,
          twitter: true
        }
      }
    },
    marker: {
      class: Marker,
    },
    inlineCode: {
      class: InlineCode,
    },
    warning: {
      class: Warning,
      inlineToolbar: true
    },
    underline: {
      class: Underline,
    },
    data: {
      blocks: []
    },
    autofocus: true,
    onChange: async () => {
      // const content = await editor.save();
      // updateBlockContent(blockId, content);
    }
  });

  // Apply the backspace fix after editor is fully initialized
  editor.isReady.then(() => {
    const editorContent = document.getElementById(`editor-${blockId}`);
    if (editorContent) {
      // Find all editable elements within the editor
      const editableElements = editorContent.querySelectorAll('[contenteditable=true]');
      editableElements.forEach(el => {
        setupBackspaceRepeat(el);
      });0
    }
  });

  editors.value.set(blockId, editor);
  return editor;
};

// Update container dimensions
const updateContainerDimensions = () => {
  if (documentPage.value) {
    containerWidth.value = documentPage.value.clientWidth;
    containerHeight.value = documentPage.value.clientHeight;
  }
};

// Get grid size based on zoom level
const getGridSize = () => {
  // Base grid size is 10px, adjusted for zoom
  return Math.max(5, Math.round(10 * props.zoom / 100));
};

// Handle block moved event
const handleBlockMoved = (block) => {
  if (props.showGrid) {
    // Ensure block position is snapped to grid
    const gridSize = getGridSize();
    block.x = Math.round(block.x / gridSize) * gridSize;
    block.y = Math.round(block.y / gridSize) * gridSize;

    // Update the model
    emit('update:modelValue', textBlocks.value);
  }
};

// Handle block resized event
const handleBlockResized = (block) => {
  if (props.showGrid) {
    // Ensure block size is snapped to grid
    const gridSize = getGridSize();
    block.width = Math.round(block.width / gridSize) * gridSize;
    block.height = Math.round(block.height / gridSize) * gridSize;

    // Update the model
    emit('update:modelValue', textBlocks.value);
  }
};

// Handle keyboard arrow keys for precise block movement
const handleKeyDown = (e) => {
  if (!selectedBlockId.value) return;

  const block = textBlocks.value.find(b => b.id === selectedBlockId.value);
  if (!block) return;

  // Handle Delete key to remove the selected block
  if (e.key === 'Delete') {
    e.preventDefault();
    deleteSelectedBlock();
    return;
  }

  // Handle z-index keyboard shortcuts (works in both states)
  /*
  if (e.ctrlKey && e.shiftKey) {
    switch (e.key) {
      case 'Home': // Ctrl+Shift+Home: Bring to front
        e.preventDefault();
        bringBlockToFront();
        return;
      case 'End': // Ctrl+Shift+End: Send to back
        e.preventDefault();
        sendBlockToBack();
        return;
      case 'ArrowUp': // Ctrl+Shift+Up: Move forward
        e.preventDefault();
        moveBlockForward();
        return;
      case 'ArrowDown': // Ctrl+Shift+Down: Move backward
        e.preventDefault();
        moveBlockBackward();
        return;
    }
  }
    */

  // If in editable state, don't handle arrow keys for movement
  // This allows the arrow keys to work normally for text editing
  if (editMode.value) {
    return;
  }

  // Only handle arrow keys for movement in locked state
  // Determine movement amount
  let moveAmount;

  if (e.shiftKey) {
    // Fine movement (1px) when Shift is pressed
    moveAmount = 1;
  } else if (props.showGrid) {
    // Grid size movement when grid is enabled
    moveAmount = getGridSize();
  } else {
    // Default movement (5px)
    moveAmount = 5;
  }

  // Handle arrow keys
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      block.x = Math.max(0, block.x - moveAmount);
      break;
    case 'ArrowRight':
      e.preventDefault();
      block.x = Math.min(containerWidth.value - block.width, block.x + moveAmount);
      break;
    case 'ArrowUp':
      e.preventDefault();
      block.y = Math.max(0, block.y - moveAmount);
      break;
    case 'ArrowDown':
      e.preventDefault();
      block.y = Math.min(containerHeight.value - block.height, block.y + moveAmount);
      break;
    default:
      return; // Exit if not an arrow key
  }

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

// Delete the selected block
const deleteSelectedBlock = () => {
  if (!selectedBlockId.value) return;
  deleteBlock(selectedBlockId.value);
};

// Delete a block by ID
const deleteBlock = (blockId) => {
  // Find the index of the block to delete
  const blockIndex = textBlocks.value.findIndex(b => b.id === blockId);
  if (blockIndex === -1) return;

  // Get the editor for this block
  const editor = editors.value.get(blockId);
  if (editor) {
    // Destroy the editor instance
    editor.destroy();
    editors.value.delete(blockId);
  }

  // Remove the block from the array
  textBlocks.value.splice(blockIndex, 1);

  // Clear the selected block ID if it was the one deleted
  if (selectedBlockId.value === blockId) {
    selectedBlockId.value = null;
  }

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

// Handle clicks on the document
const handleDocumentClick = (e) => {
  // Handle context menu closing
  if (showContextMenu.value) {
    const contextMenuElement = document.querySelector('.context-menu');
    if (contextMenuElement && !contextMenuElement.contains(e.target)) {
      closeContextMenu();
    }
  }

  // Handle editor focus
  if (editMode.value && selectedBlockId.value) {
    // Check if the click was inside the current editor
    const editorElement = document.getElementById(`editor-${selectedBlockId.value}`);
    const blockElement = editorElement?.closest('.resizable-content');

    // If click was outside the editor and its parent block
    if (editorElement && blockElement &&
      !editorElement.contains(e.target) &&
      !blockElement.contains(e.target)) {

      // If click was on another block, don't do anything (let that block's click handler work)
      const clickedOnAnotherBlock = e.target.closest('.resizable-content');
      if (clickedOnAnotherBlock) {
        return;
      }

      // If click was outside any block, refocus the current editor
      if (editMode.value) {
        e.preventDefault();
        focusEditor(selectedBlockId.value);
      }
    }
  }
};

// Initialize dimensions when mounted
onMounted(() => {
  updateContainerDimensions();

  // Add resize observer to update dimensions when window resizes
  const resizeObserver = new ResizeObserver(() => {
    updateContainerDimensions();
  });

  if (documentPage.value) {
    resizeObserver.observe(documentPage.value);
  }

  // Add keyboard event listener for arrow keys
  document.addEventListener('keydown', handleKeyDown);

  // Add click handler for document
  document.addEventListener('click', handleDocumentClick, true); // Use capture phase

  // Clean up observer and event listeners on unmount
  onUnmounted(() => {
    resizeObserver.disconnect();
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('click', handleDocumentClick, true);
    document.removeEventListener('click', closeContextMenu);
    document.removeEventListener('contextmenu', closeContextMenu);
  });
});

// Make sure to clean up editors when component is unmounted
onUnmounted(() => {
  editors.value.forEach(editor => {
    editor.destroy();
  });
  editors.value.clear();
});

const handleMouseDown = (e) => {
  if (props.action !== 'addText') return;

  const isTextBlock = e.target.closest('.text-block');
  if (isTextBlock) return;

  selectedBlockId.value = null;

  const rect = documentPage.value.getBoundingClientRect();
  isSelecting.value = true;
  startX.value = e.clientX - rect.left;
  startY.value = e.clientY - rect.top;

  selectionArea.value = {
    x: startX.value,
    y: startY.value,
    width: 0,
    height: 0,
  };
};

const handleMouseMove = (e) => {
  const rect = documentPage.value.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  // Update mouse position
  mousePosition.value = {
    x: Math.round(currentX),
    y: Math.round(currentY)
  };

  // Update selection area if selecting
  if (isSelecting.value) {
    selectionArea.value = {
      x: Math.min(startX.value, currentX),
      y: Math.min(startY.value, currentY),
      width: Math.abs(currentX - startX.value),
      height: Math.abs(currentY - startY.value),
    };
  }
};

const handleMouseUp = () => {
  if (!isSelecting.value) return;
  isSelecting.value = false;

  if (selectionArea.value.width < 10 || selectionArea.value.height < 10) {
    selectionArea.value = { x: 0, y: 0, width: 0, height: 0 };
    return;
  }

  // Find the highest z-index currently in use
  const highestZIndex = textBlocks.value.length > 0
    ? Math.max(...textBlocks.value.map(block => block.zIndex || 0))
    : 0;

  const newBlock = {
    id: Date.now(),
    ...selectionArea.value,
    isActive: true,
    content: { blocks: [] },
    zIndex: highestZIndex + 10, // New blocks are placed on top with a significant z-index increment
  };

  console.log('Created new block with z-index:', newBlock.zIndex);

  textBlocks.value.push(newBlock);
  selectBlock(textBlocks.value[textBlocks.value.length - 1].id);
  selectionArea.value = { x: 0, y: 0, width: 0, height: 0 };

  // Create editor after Vue updates the DOM
  nextTick(() => {
    createEditor(newBlock.id);
  });
};

const updateBlockContent = (id, content) => {
  const block = textBlocks.value.find(b => b.id === id);
  if (block) {
    block.content = content;
    // Update the model to save changes including text alignment
    emit('update:modelValue', textBlocks.value);
    console.log('Block content updated with alignment:', content);
  }
};

const getAllBlocksContent = async () => {
  const blocksContent = [];
  for (const block of textBlocks.value) {
    const editor = editors.value.get(block.id);
    if (editor) {
      try {
        const content = await editor.save();
        blocksContent.push({
          id: block.id,
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
          content: content
        });
      } catch (error) {
        console.error('Error saving block content:', error);
      }
    }
  }
  return blocksContent;
};

const exportToPDF = async (proposalTitle = 'proposal') => {
  try {
    console.log('Starting PDF export...'); // Debug log

    // Get all blocks content
    const blocksContent = await getAllBlocksContent();

    // Log the content for debugging
    console.log('Blocks content for PDF:', JSON.stringify(blocksContent.slice(0, 1), null, 2));

    // Find the maximum x and y coordinates of all blocks to ensure we capture everything
    let maxX = 0;
    let maxY = 0;

    blocksContent.forEach(block => {
      const blockRight = block.x + block.width;
      const blockBottom = block.y + block.height;

      if (blockRight > maxX) maxX = blockRight;
      if (blockBottom > maxY) maxY = blockBottom;
    });

    // Add some padding to ensure we capture everything
    maxX += 50;
    maxY += 50;

    // Use these dimensions for the PDF container
    const containerWidth = Math.max(795, maxX); // At least A4 width
    const containerHeight = Math.max(1125, maxY); // At least A4 height

    console.log('Container dimensions for PDF:', containerWidth, 'x', containerHeight);
    console.log('Max block coordinates:', maxX, 'x', maxY);

    // Create a container for the PDF content with dimensions that capture all blocks
    const element = document.createElement('div');
    element.style.width = `${containerWidth}px`;
    element.style.height = `${containerHeight}px`;
    element.style.position = 'relative';
    element.style.margin = '0';
    element.style.padding = '0';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.color = '#333';
    element.style.boxSizing = 'border-box';
    element.style.overflow = 'hidden';

    // Add background if it exists
    if (props.background) {
      // Create a background container that fits exactly one page
      const bgContainer = document.createElement('div');
      bgContainer.style.position = 'absolute';
      bgContainer.style.top = '0';
      bgContainer.style.left = '0';
      bgContainer.style.width = '100%';
      bgContainer.style.height = '100%';
      bgContainer.style.backgroundImage = `url(${props.background})`;
      bgContainer.style.backgroundSize = 'cover';
      bgContainer.style.backgroundPosition = 'center';
      bgContainer.style.backgroundRepeat = 'no-repeat';
      bgContainer.style.zIndex = '0';
      element.appendChild(bgContainer);
    }

    // Create a semi-transparent overlay to make content more readable
    const overlayDiv = document.createElement('div');
    overlayDiv.style.position = 'absolute';
    overlayDiv.style.top = '0';
    overlayDiv.style.left = '0';
    overlayDiv.style.right = '0';
    overlayDiv.style.bottom = '0';
    overlayDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    element.appendChild(overlayDiv);

    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.style.position = 'relative';
    contentDiv.style.zIndex = '2';
    contentDiv.style.padding = '20px';

    // Create a container for the content that preserves absolute positioning
    const contentContainer = document.createElement('div');
    contentContainer.style.position = 'relative';
    contentContainer.style.width = '100%';
    contentContainer.style.height = '100%';
    contentContainer.style.zIndex = '2';

    // Add title at the top
    const titleElement = document.createElement('h1');
    titleElement.textContent = proposalTitle;
    titleElement.style.fontSize = '24px';
    titleElement.style.marginBottom = '20px';
    titleElement.style.color = '#333';
    titleElement.style.textAlign = 'center';
    titleElement.style.position = 'relative';
    titleElement.style.zIndex = '2';
    contentContainer.appendChild(titleElement);

    // Process each block in the blocksContent array with absolute positioning
    for (const block of blocksContent) {
      if (block.content && block.content.blocks) {
        // Create a container div for this block with absolute positioning
        const blockDiv = document.createElement('div');
        blockDiv.style.position = 'absolute';
        blockDiv.style.left = `${block.x}px`;
        blockDiv.style.top = `${block.y}px`;
        blockDiv.style.width = `${block.width}px`;
        blockDiv.style.minHeight = `${block.height}px`;
        blockDiv.style.zIndex = block.zIndex || 0;
        blockDiv.style.boxSizing = 'border-box';
        blockDiv.style.padding = '10px';
        blockDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        blockDiv.style.borderRadius = '4px';
        blockDiv.style.overflow = 'hidden';

        // Create a div to hold the block content
        const blockContent = document.createElement('div');

        for (const contentBlock of block.content.blocks) {
          try {
            let contentElement;

            switch (contentBlock.type) {
              case 'header':
                const level = contentBlock.data.level || 2;
                const headerText = typeof contentBlock.data.text === 'string'
                  ? contentBlock.data.text
                  : 'Header';

                contentElement = document.createElement(`h${level}`);
                contentElement.innerHTML = headerText;
                contentElement.style.margin = '5px 0';
                contentElement.style.color = '#333';
                contentElement.style.fontWeight = 'bold';

                // Apply text alignment if it exists in the tunes
                if (contentBlock.tunes && contentBlock.tunes.alignmentTune) {
                  const alignment = contentBlock.tunes.alignmentTune.alignment;
                  contentElement.style.textAlign = alignment;
                }

                // Style headers based on level
                switch (level) {
                  case 1: contentElement.style.fontSize = '22px'; break;
                  case 2: contentElement.style.fontSize = '20px'; break;
                  case 3: contentElement.style.fontSize = '18px'; break;
                  case 4: contentElement.style.fontSize = '16px'; break;
                  case 5: contentElement.style.fontSize = '14px'; break;
                  case 6: contentElement.style.fontSize = '12px'; break;
                }
                break;

              case 'paragraph':
                const paragraphText = typeof contentBlock.data.text === 'string'
                  ? contentBlock.data.text
                  : '';

                contentElement = document.createElement('p');
                contentElement.innerHTML = paragraphText;
                contentElement.style.margin = '5px 0';
                contentElement.style.lineHeight = '1.4';
                contentElement.style.fontSize = '14px';

                // Apply text alignment if it exists in the tunes
                if (contentBlock.tunes && contentBlock.tunes.alignmentTune) {
                  const alignment = contentBlock.tunes.alignmentTune.alignment;
                  contentElement.style.textAlign = alignment;
                }
                break;

              case 'list':
                const listType = contentBlock.data.style === 'ordered' ? 'ol' : 'ul';
                contentElement = document.createElement(listType);
                contentElement.style.margin = '5px 0';
                contentElement.style.paddingLeft = '20px';

                // Apply text alignment if it exists in the tunes
                if (contentBlock.tunes && contentBlock.tunes.alignmentTune) {
                  const alignment = contentBlock.tunes.alignmentTune.alignment;
                  contentElement.style.textAlign = alignment;
                }

                if (Array.isArray(contentBlock.data.items)) {
                  contentBlock.data.items.forEach(item => {
                    const li = document.createElement('li');

                    if (typeof item === 'string') {
                      li.innerHTML = item;
                    } else if (item && typeof item === 'object') {
                      // Extract text content from object if possible
                      if (item.content) {
                        li.innerHTML = item.content;
                      } else if (item.text) {
                        li.innerHTML = item.text;
                      } else {
                        // Try to find any string property to display
                        const stringProps = Object.entries(item)
                          .filter(([_, val]) => typeof val === 'string')
                          .map(([_, val]) => val);

                        if (stringProps.length > 0) {
                          li.innerHTML = stringProps.join(' ');
                        } else {
                          li.innerHTML = 'List item';
                        }
                      }
                    }

                    li.style.margin = '3px 0';
                    li.style.fontSize = '14px';
                    contentElement.appendChild(li);
                  });
                }
                break;

              case 'table':
                if (contentBlock.data && Array.isArray(contentBlock.data.content)) {
                  contentElement = document.createElement('table');
                  contentElement.style.width = '100%';
                  contentElement.style.borderCollapse = 'collapse';
                  contentElement.style.margin = '5px 0';

                  // Apply text alignment if it exists in the tunes
                  if (contentBlock.tunes && contentBlock.tunes.alignmentTune) {
                    const alignment = contentBlock.tunes.alignmentTune.alignment;
                    contentElement.style.textAlign = alignment;
                  }

                  contentBlock.data.content.forEach(row => {
                    if (Array.isArray(row)) {
                      const tr = document.createElement('tr');

                      row.forEach(cell => {
                        const td = document.createElement('td');

                        if (typeof cell === 'string') {
                          td.innerHTML = cell;
                        } else if (cell && typeof cell === 'object') {
                          // Extract text content from object if possible
                          if (cell.content) {
                            td.innerHTML = cell.content;
                          } else if (cell.text) {
                            td.innerHTML = cell.text;
                          } else {
                            // Try to find any string property to display
                            const stringProps = Object.entries(cell)
                              .filter(([_, val]) => typeof val === 'string')
                              .map(([_, val]) => val);

                            if (stringProps.length > 0) {
                              td.innerHTML = stringProps.join(' ');
                            }
                          }
                        } else if (cell !== null && cell !== undefined) {
                          td.innerHTML = String(cell);
                        }

                        td.style.border = '1px solid #ddd';
                        td.style.padding = '4px';
                        td.style.fontSize = '12px';
                        tr.appendChild(td);
                      });

                      contentElement.appendChild(tr);
                    }
                  });
                }
                break;

              case 'quote':
                contentElement = document.createElement('blockquote');
                contentElement.style.borderLeft = '3px solid #ccc';
                contentElement.style.margin = '5px 0';
                contentElement.style.padding = '5px 10px';
                contentElement.style.fontStyle = 'italic';
                contentElement.style.color = '#555';

                // Apply text alignment if it exists in the tunes
                if (contentBlock.tunes && contentBlock.tunes.alignmentTune) {
                  const alignment = contentBlock.tunes.alignmentTune.alignment;
                  contentElement.style.textAlign = alignment;
                }

                const quoteText = typeof contentBlock.data.text === 'string'
                  ? contentBlock.data.text
                  : '';

                const quoteP = document.createElement('p');
                quoteP.innerHTML = quoteText;
                quoteP.style.margin = '0 0 5px 0';
                quoteP.style.fontSize = '14px';
                contentElement.appendChild(quoteP);

                if (contentBlock.data.caption) {
                  const captionText = typeof contentBlock.data.caption === 'string'
                    ? contentBlock.data.caption
                    : '';

                  const footer = document.createElement('footer');
                  footer.innerHTML = captionText;
                  footer.style.fontSize = '12px';
                  footer.style.textAlign = 'right';
                  contentElement.appendChild(footer);
                }
                break;

              case 'image':
                if (contentBlock.data && contentBlock.data.url) {
                  contentElement = document.createElement('figure');
                  contentElement.style.margin = '5px 0';
                  contentElement.style.textAlign = 'center';

                  const img = document.createElement('img');
                  img.src = contentBlock.data.url;
                  img.alt = contentBlock.data.caption || '';
                  img.style.maxWidth = '100%';
                  img.style.height = 'auto';
                  img.style.display = 'block';
                  img.style.margin = '0 auto';
                  contentElement.appendChild(img);

                  if (contentBlock.data.caption) {
                    const captionText = typeof contentBlock.data.caption === 'string'
                      ? contentBlock.data.caption
                      : '';

                    const figcaption = document.createElement('figcaption');
                    figcaption.textContent = captionText;
                    figcaption.style.fontSize = '12px';
                    figcaption.style.color = '#666';
                    figcaption.style.marginTop = '3px';
                    contentElement.appendChild(figcaption);
                  }
                }
                break;

              case 'delimiter':
                contentElement = document.createElement('hr');
                contentElement.style.margin = '10px 0';
                contentElement.style.border = 'none';
                contentElement.style.borderTop = '1px solid #eee';
                break;

              case 'checklist':
                if (contentBlock.data && Array.isArray(contentBlock.data.items)) {
                  contentElement = document.createElement('div');
                  contentElement.style.margin = '5px 0';

                  contentBlock.data.items.forEach(item => {
                    if (item && typeof item === 'object') {
                      const checkboxColor = item.checked ? '#4CAF50' : 'transparent';
                      const checkmark = item.checked ? '✓' : '';

                      // Extract text content from the item
                      let itemText = '';
                      if (typeof item.text === 'string') {
                        itemText = item.text;
                      } else if (item.text && typeof item.text === 'object') {
                        // Handle nested object
                        if (item.text.content) {
                          itemText = item.text.content;
                        } else {
                          // Try to find any string property to display
                          const stringProps = Object.entries(item.text)
                            .filter(([_, val]) => typeof val === 'string')
                            .map(([_, val]) => val);

                          if (stringProps.length > 0) {
                            itemText = stringProps.join(' ');
                          }
                        }
                      } else if (item.content) {
                        itemText = item.content;
                      }

                      const checkItem = document.createElement('div');
                      checkItem.style.display = 'flex';
                      checkItem.style.alignItems = 'center';
                      checkItem.style.margin = '3px 0';

                      const checkbox = document.createElement('div');
                      checkbox.style.width = '14px';
                      checkbox.style.height = '14px';
                      checkbox.style.border = '1px solid #999';
                      checkbox.style.borderRadius = '3px';
                      checkbox.style.marginRight = '6px';
                      checkbox.style.position = 'relative';
                      checkbox.style.backgroundColor = checkboxColor;
                      checkbox.style.display = 'flex';
                      checkbox.style.alignItems = 'center';
                      checkbox.style.justifyContent = 'center';
                      checkbox.style.color = 'white';
                      checkbox.innerHTML = checkmark;

                      const text = document.createElement('div');
                      text.innerHTML = itemText;
                      text.style.fontSize = '14px';

                      checkItem.appendChild(checkbox);
                      checkItem.appendChild(text);
                      contentElement.appendChild(checkItem);
                    }
                  });
                }
                break;

              default:
                // For unsupported block types
                contentElement = document.createElement('p');
                contentElement.textContent = `Unsupported content type: ${contentBlock.type}`;
                contentElement.style.color = '#999';
                contentElement.style.fontStyle = 'italic';
                contentElement.style.margin = '5px 0';
                contentElement.style.fontSize = '12px';
            }

            if (contentElement) {
              blockContent.appendChild(contentElement);
            }
          } catch (blockError) {
            console.error('Error processing block:', blockError, contentBlock);
            const errorElement = document.createElement('p');
            errorElement.textContent = 'Error processing content';
            errorElement.style.color = 'red';
            errorElement.style.margin = '5px 0';
            blockContent.appendChild(errorElement);
          }
        }

        // Add the block content to the block div
        blockDiv.appendChild(blockContent);

        // Add the block div to the content container
        contentContainer.appendChild(blockDiv);
      }
    }

    // Add the content container to the main element
    contentDiv.appendChild(contentContainer);
    element.appendChild(contentDiv);

    // Add element to document temporarily
    document.body.appendChild(element);

    // Calculate the PDF dimensions based on the container dimensions
    // Convert pixels to mm (assuming 96 DPI)
    const pdfWidth = containerWidth * 25.4 / 96; // Convert px to mm
    const pdfHeight = containerHeight * 25.4 / 96; // Convert px to mm

    console.log('PDF dimensions (mm):', pdfWidth, 'x', pdfHeight);

    const opt = {
      margin: 0, // No margins to match layout exactly
      filename: `${proposalTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 1, // Use scale 1 to match dimensions exactly
        useCORS: true,
        logging: true, // Enable logging for debugging
        allowTaint: true,
        backgroundColor: null,
        width: containerWidth,
        height: containerHeight
      },
      jsPDF: {
        unit: 'mm',
        format: [pdfWidth, pdfHeight], // Custom size matching container dimensions
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all'] }
    };

    // Generate PDF
    try {
      await html2pdf()
        .from(element)
        .set(opt)
        .save();
      console.log('PDF generation completed');
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      throw pdfError;
    } finally {
      // Cleanup
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }

    return true;
  } catch (error) {
    console.error('Error in exportToPDF:', error);
    throw error;
  }
};

// Make sure to expose the method
defineExpose({
  getAllBlocksContent,
  exportToPDF
});

const selectBlock = (id) => {
  // If the block is already selected, toggle edit mode
  if (selectedBlockId.value === id) {
    editMode.value = true; // Second click always enters edit mode

    // Focus the editor after entering edit mode
    nextTick(() => {
      focusEditor(id);
    });
  } else {
    // If selecting a different block, select it and set to locked/move mode
    selectedBlockId.value = id;
    editMode.value = false; // First click always enters locked/move mode
  }
};

// Function to focus the editor
const focusEditor = (blockId) => {
  if (!blockId) return;

  // Get the editor instance
  const editor = editors.value.get(blockId);
  if (!editor) return;

  // Focus the editor
  nextTick(() => {
    try {
      // Find the editable element within the editor
      const editorElement = document.getElementById(`editor-${blockId}`);
      if (editorElement) {
        // Find the first editable element and focus it
        const editableElement = editorElement.querySelector('[contenteditable=true]');
        if (editableElement) {
          editableElement.focus();
          editorHasFocus.value = true;

          // Place cursor at the end of the text
          const range = document.createRange();
          const selection = window.getSelection();

          // If there's text content, place cursor at the end
          if (editableElement.childNodes.length > 0) {
            const lastNode = editableElement.childNodes[editableElement.childNodes.length - 1];
            range.setStartAfter(lastNode);
          } else {
            range.selectNodeContents(editableElement);
            range.collapse(false); // Collapse to end
          }

          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } catch (error) {
      console.error('Error focusing editor:', error);
    }
  });
};

// Get position text for the selected block
const getSelectedBlockPositionText = () => {
  if (!selectedBlockId.value) return '';

  const block = textBlocks.value.find(b => b.id === selectedBlockId.value);
  if (!block) return '';

  return `X: ${block.x}px  Y: ${block.y}px  W: ${block.width}px  H: ${block.height}px  Z: ${block.zIndex || 0}`;
};

// Move the selected block forward in the z-order
const moveBlockForward = () => {
  if (!selectedBlockId.value) return;

  const blockIndex = textBlocks.value.findIndex(b => b.id === selectedBlockId.value);
  if (blockIndex === -1) return;

  // Get the current block
  const currentBlock = textBlocks.value[blockIndex];

  // Ensure all blocks have a z-index
  textBlocks.value.forEach(b => {
    if (b.zIndex === undefined) {
      b.zIndex = 0;
    }
  });

  // Find blocks with higher z-index
  const blocksAbove = textBlocks.value
    .filter(b => b.id !== currentBlock.id && b.zIndex >= currentBlock.zIndex)
    .sort((a, b) => a.zIndex - b.zIndex);

  if (blocksAbove.length > 0) {
    // Get the block just above this one
    const nextBlock = blocksAbove[0];

    // Increment this block's z-index to be higher than the next block
    currentBlock.zIndex = nextBlock.zIndex + 1;
  } else {
    // Already at the top, just increment to be safe
    currentBlock.zIndex = (currentBlock.zIndex || 0) + 10;
  }

  console.log('Block z-index after moving forward:', currentBlock.zIndex);
  console.log('All blocks z-index:', textBlocks.value.map(b => ({ id: b.id, zIndex: b.zIndex })));

  // Force a reactive update
  textBlocks.value = [...textBlocks.value];

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

// Move the selected block backward in the z-order
const moveBlockBackward = () => {
  if (!selectedBlockId.value) return;

  const blockIndex = textBlocks.value.findIndex(b => b.id === selectedBlockId.value);
  if (blockIndex === -1) return;

  // Get the current block
  const currentBlock = textBlocks.value[blockIndex];

  // Ensure all blocks have a z-index
  textBlocks.value.forEach(b => {
    if (b.zIndex === undefined) {
      b.zIndex = 0;
    }
  });

  // Find blocks with lower z-index
  const blocksBelow = textBlocks.value
    .filter(b => b.id !== currentBlock.id && b.zIndex <= currentBlock.zIndex)
    .sort((a, b) => b.zIndex - a.zIndex);

  if (blocksBelow.length > 0) {
    // Get the block just below this one
    const prevBlock = blocksBelow[0];

    // Decrement this block's z-index to be lower than the previous block
    currentBlock.zIndex = Math.max(0, prevBlock.zIndex - 1);
  } else {
    // Already at the bottom, just decrement to be safe
    currentBlock.zIndex = Math.max(0, (currentBlock.zIndex || 0) - 10);
  }

  console.log('Block z-index after moving backward:', currentBlock.zIndex);
  console.log('All blocks z-index:', textBlocks.value.map(b => ({ id: b.id, zIndex: b.zIndex })));

  // Force a reactive update
  textBlocks.value = [...textBlocks.value];

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

// Bring the selected block to the front (highest z-index)
const bringBlockToFront = () => {
  if (!selectedBlockId.value) return;

  const blockIndex = textBlocks.value.findIndex(b => b.id === selectedBlockId.value);
  if (blockIndex === -1) return;

  // Set all blocks to have a base z-index of 0
  textBlocks.value.forEach(b => {
    if (b.id !== selectedBlockId.value) {
      b.zIndex = 0;
    }
  });

  // Set the selected block to have a high z-index
  textBlocks.value[blockIndex].zIndex = 100;

  console.log('Block z-index after bringing to front:', textBlocks.value[blockIndex].zIndex);
  console.log('All blocks z-index:', textBlocks.value.map(b => ({ id: b.id, zIndex: b.zIndex })));

  // Force a reactive update
  textBlocks.value = [...textBlocks.value];

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

// Send the selected block to the back (lowest z-index)
const sendBlockToBack = () => {
  if (!selectedBlockId.value) return;

  const blockIndex = textBlocks.value.findIndex(b => b.id === selectedBlockId.value);
  if (blockIndex === -1) return;

  // Set all blocks to have a high z-index
  textBlocks.value.forEach(b => {
    if (b.id !== selectedBlockId.value) {
      b.zIndex = 100;
    }
  });

  // Set the selected block to have a low z-index
  textBlocks.value[blockIndex].zIndex = 0;

  console.log('Block z-index after sending to back:', textBlocks.value[blockIndex].zIndex);
  console.log('All blocks z-index:', textBlocks.value.map(b => ({ id: b.id, zIndex: b.zIndex })));

  // Force a reactive update
  textBlocks.value = [...textBlocks.value];

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

// Open context menu for a block
const openContextMenu = (event, blockId) => {
  // Set the position of the context menu
  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  };

  // Set the block ID for the context menu
  contextMenuBlockId.value = blockId;

  // Select the block
  selectBlock(blockId);

  // Show the context menu
  showContextMenu.value = true;

  // Add a click event listener to close the context menu when clicking outside
  document.addEventListener('click', closeContextMenu);
  document.addEventListener('contextmenu', closeContextMenu);
};

// Close the context menu
const closeContextMenu = () => {
  showContextMenu.value = false;

  // Remove the event listeners
  document.removeEventListener('click', closeContextMenu);
  document.removeEventListener('contextmenu', closeContextMenu);
};

// Handle context menu actions
const handleContextMenuAction = (action) => {
  // Close the context menu
  closeContextMenu();

  // If no block is selected, return
  if (!contextMenuBlockId.value) return;

  // Select the block if it's not already selected
  if (selectedBlockId.value !== contextMenuBlockId.value) {
    selectBlock(contextMenuBlockId.value);
  }

  // Perform the action
  switch (action) {
    case 'edit':
      // Set edit mode to true
      editMode.value = true;
      // Focus the editor
      focusEditor(contextMenuBlockId.value);
      break;
    case 'delete':
      // Delete the block
      deleteBlock(contextMenuBlockId.value);
      break;
    case 'bringToFront':
      // Bring the block to the front
      bringBlockToFront();
      break;
    case 'moveForward':
      // Move the block forward
      moveBlockForward();
      break;
    case 'moveBackward':
      // Move the block backward
      moveBlockBackward();
      break;
    case 'sendToBack':
      // Send the block to the back
      sendBlockToBack();
      break;
  }
};

// Align blocks to guides
const alignBlocksToGuides = (guides) => {
  if (!selectedBlockId.value) return;

  const block = textBlocks.value.find(b => b.id === selectedBlockId.value);
  if (!block) return;

  // Check if block is close to any horizontal guide
  if (guides.horizontalGuides) {
    guides.horizontalGuides.forEach(guidePos => {
      // Check if top edge is close to guide
      if (Math.abs(block.y - guidePos) < 10) {
        block.y = guidePos;
      }
      // Check if bottom edge is close to guide
      else if (Math.abs(block.y + block.height - guidePos) < 10) {
        block.y = guidePos - block.height;
      }
      // Check if center is close to guide
      else if (Math.abs(block.y + block.height / 2 - guidePos) < 10) {
        block.y = guidePos - block.height / 2;
      }
    });
  }

  // Check if block is close to any vertical guide
  if (guides.verticalGuides) {
    guides.verticalGuides.forEach(guidePos => {
      // Check if left edge is close to guide
      if (Math.abs(block.x - guidePos) < 10) {
        block.x = guidePos;
      }
      // Check if right edge is close to guide
      else if (Math.abs(block.x + block.width - guidePos) < 10) {
        block.x = guidePos - block.width;
      }
      // Check if center is close to guide
      else if (Math.abs(block.x + block.width / 2 - guidePos) < 10) {
        block.x = guidePos - block.width / 2;
      }
    });
  }

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

watch(() => props.action, (newAction) => {
  if (newAction === 'addText') {
    isSelecting.value = false;
    selectionArea.value = { x: 0, y: 0, width: 0, height: 0 };
  }
});
</script>

<template>
  <div class="editor-container" ref="documentPage" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
    @mouseup="handleMouseUp" :style="{
      backgroundImage: props.background ? `url(${props.background})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }">
    <!-- Text Blocks -->
    <div v-for="block in textBlocks" :key="block.id" class="block-wrapper" :style="{ 'z-index': block.zIndex || 0 }">
      <draggable-resizable-vue class="resizable-content" :class="{
        'text-block-selected': block.id == selectedBlockId,
        'editable-state': editMode && block.id == selectedBlockId,
        'locked-state': !editMode && block.id == selectedBlockId
      }" @mousedown.stop="selectBlock(block.id)" @contextmenu.prevent="openContextMenu($event, block.id)"
        v-model:x="block.x" v-model:y="block.y" v-model:h="block.height" v-model:w="block.width"
        v-model:active="block.isActive" :grid="props.showGrid ? [getGridSize(), getGridSize()] : [1, 1]"
        :snap="props.showGrid" :draggable="!editMode || block.id != selectedBlockId"
        :resizable="true" @dragstop="handleBlockMoved(block)"
        @resizestop="handleBlockResized(block)" handles-type="borders">
        <div class="text-block-content">
          <div :id="`editor-${block.id}`"></div>
        </div>

        <!-- Mode Indicator -->
        <div v-if="block.id == selectedBlockId && !props.readonly" class="mode-indicator">
          {{ editMode ? 'Editable State (Edit & Resize)' : 'Locked State (Move & Resize)' }}
        </div>

        <!-- Z-Index Controls -->
        <div v-if="block.id == selectedBlockId && !props.readonly" class="block-controls">
          <!-- Bring to Front -->
          <div class="block-control-btn bring-to-front" @click.stop="bringBlockToFront()">
            <span class="material-icons">vertical_align_top</span>
            <span class="tooltip">Bring to Front</span>
          </div>

          <!-- Move Forward -->
          <div class="block-control-btn move-forward" @click.stop="moveBlockForward()">
            <span class="material-icons">arrow_upward</span>
            <span class="tooltip">Move Forward</span>
          </div>

          <!-- Move Backward -->
          <div class="block-control-btn move-backward" @click.stop="moveBlockBackward()">
            <span class="material-icons">arrow_downward</span>
            <span class="tooltip">Move Backward</span>
          </div>

          <!-- Send to Back -->
          <div class="block-control-btn send-to-back" @click.stop="sendBlockToBack()">
            <span class="material-icons">vertical_align_bottom</span>
            <span class="tooltip">Send to Back</span>
          </div>
        </div>

        <!-- This section intentionally left empty -->

        <!-- This section intentionally left empty -->

        <!-- Delete Button -->
        <div v-if="block.id == selectedBlockId && !props.readonly" class="block-delete-btn"
          @click.stop="deleteBlock(block.id)">
          <span class="material-icons">close</span>
        </div>
      </draggable-resizable-vue>
    </div>

    <!-- Selection Area -->
    <div v-if="isSelecting" class="selection-area" :style="{
      left: `${selectionArea.x}px`,
      top: `${selectionArea.y}px`,
      width: `${selectionArea.width}px`,
      height: `${selectionArea.height}px`,
    }">
    </div>

    <!-- Selection Area -->
    <div v-if="isSelecting" class="selection-area" :style="{
      left: `${selectionArea.x}px`,
      top: `${selectionArea.y}px`,
      width: `${selectionArea.width}px`,
      height: `${selectionArea.height}px`
    }"></div>

    <!-- Ruler Component -->
    <EditorRuler v-if="!props.readonly" v-model:showGrid="props.showGrid" :zoom="props.zoom"
      :containerWidth="containerWidth" :containerHeight="containerHeight" :gridSize="getGridSize()" :blocks="textBlocks"
      @alignBlocks="alignBlocksToGuides" />

    <!-- Position Indicators -->
    <div v-if="selectedBlockId && !props.readonly" class="position-indicator block-position">
      {{ getSelectedBlockPositionText() }}
    </div>

    <!-- Debug Z-Index Display -->
    <div v-if="!props.readonly" class="debug-z-index">
      <div v-for="block in textBlocks" :key="block.id" class="debug-block">
        Block {{ block.id.toString().slice(-4) }}: z-index {{ block.zIndex || 0 }}
      </div>
    </div>

    <!-- Mouse Position Indicator -->
    <div v-if="!props.readonly" class="position-indicator mouse-position">
      X: {{ mousePosition.x }}px Y: {{ mousePosition.y }}px
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div v-if="!props.readonly" class="keyboard-shortcuts">
      <div class="shortcut-icon" title="Keyboard Shortcuts">
        <span class="material-icons">keyboard</span>
        <div class="shortcut-tooltip">
          <div class="tooltip-title">Keyboard Shortcuts</div>
          <div class="shortcut-item">
            <span class="key">First Click</span>
            <span>Locked State (Move & Resize)</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Second Click</span>
            <span>Editable State (Edit & Resize)</span>
          </div>
          <div class="shortcut-item">
            <span class="key">↑ ↓ ← →</span>
            <span>Move block (Locked State)</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Shift + Arrows</span>
            <span>Move by 1px (Locked State)</span>
          </div>
          <div class="shortcut-item">
            <span class="key">↑ ↓ ← →</span>
            <span>Navigate text (Editable State)</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Delete</span>
            <span>Delete selected block</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl+Shift+↑</span>
            <span>Move block forward</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl+Shift+↓</span>
            <span>Move block backward</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl+Shift+Home</span>
            <span>Bring block to front</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl+Shift+End</span>
            <span>Send block to back</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div v-if="showContextMenu" class="context-menu"
      :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }">
      <div class="context-menu-item" @click="handleContextMenuAction('edit')">
        <span class="material-icons">edit</span>
        <span>Edit Content</span>
      </div>
      <div class="context-menu-item" @click="handleContextMenuAction('delete')">
        <span class="material-icons">delete</span>
        <span>Delete Block</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-header">Arrange</div>
      <div class="context-menu-item" @click="handleContextMenuAction('bringToFront')">
        <span class="material-icons">vertical_align_top</span>
        <span>Bring to Front</span>
        <span class="shortcut-hint">Ctrl+Shift+Home</span>
      </div>
      <div class="context-menu-item" @click="handleContextMenuAction('moveForward')">
        <span class="material-icons">arrow_upward</span>
        <span>Move Forward</span>
        <span class="shortcut-hint">Ctrl+Shift+↑</span>
      </div>
      <div class="context-menu-item" @click="handleContextMenuAction('moveBackward')">
        <span class="material-icons">arrow_downward</span>
        <span>Move Backward</span>
        <span class="shortcut-hint">Ctrl+Shift+↓</span>
      </div>
      <div class="context-menu-item" @click="handleContextMenuAction('sendToBack')">
        <span class="material-icons">vertical_align_bottom</span>
        <span>Send to Back</span>
        <span class="shortcut-hint">Ctrl+Shift+End</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 800px;
  background: white;

  /* Add a semi-transparent overlay */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    pointer-events: none;
  }
}

.resizable-content {
  position: relative;
  /* Change to relative */
  z-index: 1;
  /* Ensure blocks appear above the background */
  background: rgba(255, 255, 255, 0.9);
  /* Semi-transparent background */
  padding-top: 25px;
  /* Space for horizontal ruler */
  padding-left: 25px;
  /* Space for vertical ruler */
}

.block-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* Make sure z-index is respected */
  transform: translateZ(0);
}

.resizable-content {
  position: absolute;
  min-width: 100px;
  min-height: 100px;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  /* Removed overflow: hidden to allow menus to extend outside the block */
  pointer-events: auto;
}

.text-block-content {
  height: 100%;
  padding: 10px;
  overflow: auto; /* Allow scrolling for content */
  position: relative; /* Establish positioning context */
}

.text-block-selected {
  border: 2px solid #2196F3;
  box-shadow: 0 0 0 1px #2196F3, 0 2px 4px rgba(0, 0, 0, 0.1);
}

.selection-area {
  position: absolute;
  border: 2px dashed #1976D2;
  background: rgba(25, 118, 210, 0.1);
  pointer-events: none;
}

:deep(.codex-editor) {
  height: 100%;
}

:deep(.ce-block__content) {
  max-width: none;
  margin: 0;
}

:deep(.ce-toolbar__content) {
  max-width: none;
  margin: 0;
}

/* Editor toolbar and settings styles */
:deep(.ce-toolbar) {
  z-index: 1000 !important; /* Ensure toolbar appears above other elements */
  position: absolute !important;
  background: transparent !important;

  /* Ensure toolbar actions are visible */
  .ce-toolbar__actions {
    position: absolute !important;
    right: 0 !important;
    top: 0 !important;
    display: flex !important;
    padding: 0 !important;
  }
}

:deep(.ce-toolbar__plus) {
  z-index: 1000 !important;
  background-color: white !important;
  border-radius: 50% !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
  width: 26px !important;
  height: 26px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin-right: 5px !important;
}

:deep(.ce-toolbar__settings-btn) {
  z-index: 1000 !important;
  background-color: white !important;
  border-radius: 50% !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
  width: 26px !important;
  height: 26px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.ce-conversion-toolbar) {
  z-index: 1001 !important; /* Higher than toolbar */
  position: absolute !important;
  background-color: white !important;
  border-radius: 4px !important;
  box-shadow: 0 3px 15px -3px rgba(13, 20, 33, 0.13) !important;
  padding: 6px !important;

  /* Ensure conversion tools are visible */
  .ce-conversion-tool {
    display: flex !important;
    align-items: center !important;
    padding: 5px !important;
    border-radius: 3px !important;

    &:hover {
      background-color: #f1f1f1 !important;
    }

    &__icon {
      margin-right: 10px !important;
    }
  }
}

:deep(.ce-settings) {
  z-index: 1002 !important; /* Higher than conversion toolbar */
  position: absolute;
}

:deep(.ce-inline-toolbar) {
  z-index: 1003 !important; /* Highest priority */
  position: absolute !important;
  background-color: white !important;
  border-radius: 4px !important;
  box-shadow: 0 3px 15px -3px rgba(13, 20, 33, 0.13) !important;

  /* Ensure inline toolbar buttons are visible */
  .ce-inline-tool {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 5px !important;

    &--active {
      color: rgb(34, 186, 255) !important;
    }
  }
}

/* Text alignment styles */
:deep(.ce-block) {
  &.ce-block--left {
    text-align: left;
  }

  &.ce-block--center {
    text-align: center;
  }

  &.ce-block--right {
    text-align: right;
  }
}

/* Alignment tune button styles */
:deep(.ce-settings) {
  .ce-settings__button {
    &--active {
      background-color: rgba(34, 186, 255, 0.2);
    }
  }

  /* Ensure the settings panel is not cut off */
  position: absolute !important;
  left: 0 !important;
  top: -40px !important;
  background-color: white !important;
  border-radius: 4px !important;
  box-shadow: 0 3px 15px -3px rgba(13, 20, 33, 0.13) !important;
  z-index: 1002 !important;
}

/* Position indicators */
.position-indicator {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  z-index: 100;
  pointer-events: none;
}

.block-position {
  bottom: 10px;
  right: 10px;
}

.mouse-position {
  top: 35px;
  /* Below the horizontal ruler */
  right: 10px;
}

/* Keyboard shortcuts tooltip */
.keyboard-shortcuts {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 100;
}

.shortcut-icon {
  width: 30px;
  height: 30px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.shortcut-icon:hover .shortcut-tooltip {
  display: block;
}

.shortcut-tooltip {
  display: none;
  position: absolute;
  bottom: 40px;
  left: 0;
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px;
  border-radius: 4px;
  width: 220px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.tooltip-title {
  font-weight: bold;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 5px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
}

.key {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
}

/* Block controls container */
.block-controls {
  position: absolute;
  top: -40px;
  left: 0;
  display: flex;
  gap: 5px;
  z-index: 10;
}

/* Block control buttons */
.block-control-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  position: relative;
}

.block-control-btn .material-icons {
  font-size: 16px;
  color: white;
}

.block-control-btn:hover .tooltip {
  display: block;
}

.block-control-btn .tooltip {
  display: none;
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 10px;
  white-space: nowrap;
}

/* Specific control button styles */
.bring-to-front {
  background-color: #2196F3;
}

.bring-to-front:hover {
  background-color: #1976D2;
}

.move-forward {
  background-color: #4CAF50;
}

.move-forward:hover {
  background-color: #388E3C;
}

.move-backward {
  background-color: #FF9800;
}

.move-backward:hover {
  background-color: #F57C00;
}

.send-to-back {
  background-color: #9C27B0;
}

.send-to-back:hover {
  background-color: #7B1FA2;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  min-width: 200px;
  z-index: 1000;
  padding: 8px 0;
  font-size: 14px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  position: relative;
}

.context-menu-item:hover {
  background-color: #f5f5f5;
}

.context-menu-item .material-icons {
  font-size: 18px;
  margin-right: 8px;
  color: #555;
}

.context-menu-divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 8px 0;
}

.context-menu-header {
  padding: 8px 16px;
  font-weight: 500;
  color: #757575;
  font-size: 12px;
  text-transform: uppercase;
}

.shortcut-hint {
  position: absolute;
  right: 16px;
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

/* Debug Z-Index Display */
.debug-z-index {
  position: absolute;
  top: 35px;
  left: 35px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  z-index: 1000;
}

.debug-block {
  margin: 3px 0;
}

/* Block delete button */
.block-delete-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 20px;
  height: 20px;
  background-color: #f44336;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.block-delete-btn .material-icons {
  font-size: 14px;
}

.block-delete-btn:hover {
  background-color: #d32f2f;
}

/* Mode indicator */
.mode-indicator {
  position: absolute;
  top: -30px;
  left: 0;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10;
  pointer-events: none;
}

/* Editable state styles */
.editable-state {
  border: 2px solid #4CAF50 !important;
  box-shadow: 0 0 0 1px #4CAF50, 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  cursor: text !important;
}

/* Style for editable elements to make them more visible */
.editable-state [contenteditable=true] {
  outline: none;
  min-height: 1em;
  padding: 2px;
}

.editable-state [contenteditable=true]:focus {
  background-color: rgba(76, 175, 80, 0.05);
}

/* Show resize handles in editable state */
.editable-state :deep(.handle) {
  background-color: #4CAF50 !important;
  border-color: #4CAF50 !important;
}

/* Add a hint about resizability */
.editable-state::after {
  content: 'Resize ↔';
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 10px;
  color: #4CAF50;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 2px 4px;
  border-radius: 2px;
  pointer-events: none;
}

/* Locked state styles */
.locked-state {
  border: 2px solid #2196F3 !important;
  box-shadow: 0 0 0 1px #2196F3, 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  cursor: move !important;
}
</style>
