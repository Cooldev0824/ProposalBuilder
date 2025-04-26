<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import DraggableResizableVue from 'draggable-resizable-vue3'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Checklist from '@editorjs/checklist'
import Quote from '@editorjs/quote'
import Table from '@editorjs/table'
import Image from '@editorjs/image'
import Paragraph from '@editorjs/paragraph'

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => [],
    },
    zoom: {
        type: Number,
        default: 100,
    },
    action: {
        type: String,
        default: null,
    },
});

const emit = defineEmits(['update:modelValue']);
const editors = ref(new Map());

const createEditor = (blockId) => {
    const editor = new EditorJS({
        holder: `editor-${blockId}`,
        tools: {
            header: {
                class: Header,
                inlineToolbar: true,
                config: {
                    levels: [1, 2, 3, 4, 5, 6],
                    defaultLevel: 3
                }
            },
            paragraph: {
                class: Paragraph,
                inlineToolbar: true,
            },
            list: {
                class: List,
                inlineToolbar: true,
            },
            checklist: {
                class: Checklist,
                inlineToolbar: true,
            },
            quote: {
                class: Quote,
                inlineToolbar: true,
                config: {
                    quotePlaceholder: 'Enter a quote',
                    captionPlaceholder: 'Quote\'s author',
                },
            },
            table: {
                class: Table,
                inlineToolbar: true,
                config: {
                    rows: 2,
                    cols: 3,
                },
            },
            image: {
                class: Image,
                config: {
                    endpoints: {
                        byFile: 'http://localhost:8080/uploadFile',
                        byUrl: 'http://localhost:8080/fetchUrl',
                    }
                }
            }
        },
        data: {
            blocks: []
        },
        onChange: async () => {
            const content = await editor.save();
            updateBlockContent(blockId, content);
        }
    });
    
    editors.value.set(blockId, editor);
    return editor;
};

onUnmounted(() => {
    editors.value.forEach(editor => {
        editor.destroy();
    });
    editors.value.clear();
});

const documentPage = ref(null);
const textBlocks = ref([]);
const isSelecting = ref(false);
const selectionArea = ref({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
});
const startX = ref(0);
const startY = ref(0);
const selectedBlockId = ref(null);

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
    if (!isSelecting.value) return;

    const rect = documentPage.value.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    selectionArea.value = {
        x: Math.min(startX.value, currentX),
        y: Math.min(startY.value, currentY),
        width: Math.abs(currentX - startX.value),
        height: Math.abs(currentY - startY.value),
    };
};

const handleMouseUp = () => {
    if (!isSelecting.value) return;
    isSelecting.value = false;

    if (selectionArea.value.width < 10 || selectionArea.value.height < 10) {
        selectionArea.value = { x: 0, y: 0, width: 0, height: 0 };
        return;
    }

    const newBlock = {
        id: Date.now(),
        ...selectionArea.value,
        content: { blocks: [] },
    };

    textBlocks.value.push(newBlock);
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
        emit('update:modelValue', textBlocks.value);
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

defineExpose({
    getAllBlocksContent
});

const selectBlock = (id) => {
    selectedBlockId.value = id;
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
        @mouseup="handleMouseUp">
        
        <!-- Text Blocks -->
        <draggable-resizable-vue v-for="block in textBlocks" :key="block.id" class="resizable-content"
            :class="{ 'text-block-selected': selectedBlockId === block.id }" @mousedown.stop="selectBlock(block.id)"
            :style="{
                left: `${block.x}px`,
                top: `${block.y}px`,
                minWidth: `${block.width}px`,
                minHeight: `${block.height}px`,
            }">
            <div class="text-block-content">
                <div :id="`editor-${block.id}`"></div>
            </div>
        </draggable-resizable-vue>

        <!-- Selection Area -->
        <div v-if="isSelecting" class="selection-area" :style="{
            left: `${selectionArea.x}px`,
            top: `${selectionArea.y}px`,
            width: `${selectionArea.width}px`,
            height: `${selectionArea.height}px`,
        }">
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
    overflow: hidden;
}

.text-block-content {
    padding: 8px;
    min-height: 30px;
    outline: none;
    height: 100%;
}

.text-block-selected {
    border: 2px solid #2196F3;
    box-shadow: 0 0 0 1px #2196F3, 0 2px 4px rgba(0, 0, 0, 0.1);
}

.selection-area {
    position: absolute;
    border: 2px dashed #2196F3;
    background: rgba(33, 150, 243, 0.1);
    pointer-events: none;
}

.resizable-content {
    position: absolute;
    min-width: 100px;
    min-height: 100px;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
</style>
