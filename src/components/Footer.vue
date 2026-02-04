<template>
  <footer class="bg-white border-t border-gray-200 text-gray-600 py-3 px-6 z-10 w-full shrink-0">
    <div class="flex items-center justify-center space-x-3">
      <!-- 3D Spinning Ring (Volumetric Layers) -->
      <div class="ring-scene w-8 h-8 flex items-center justify-center perspective-container">
        <div class="ring-3d">
          <!-- Stack multiple layers to simulate solid thickness -->
          <div 
            v-for="i in 10" 
            :key="i" 
            class="ring-layer" 
            :style="{ 
              transform: `translateZ(${(i - 5.5) * 0.5}px)`,
              borderColor: i === 1 || i === 10 ? '#eab308' : '#b45309' 
            }"
          ></div>
        </div>
      </div>
      
      <div class="flex flex-col sm:flex-row items-center gap-1.5 text-xs sm:text-sm">
        <span class="text-gray-800 font-bold hover:text-yellow-600 transition-colors cursor-default" style="font-family: serif;">
          2팀 반지원정대
        </span>
        <span class="hidden sm:inline text-gray-300">|</span>
        <span class="text-gray-500 font-medium">
          김선일 · 강성훈 · 정진호 · 황자현
        </span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.perspective-container {
  perspective: 100px;
}

.ring-3d {
  position: relative;
  width: 24px;
  height: 24px;
  transform-style: preserve-3d;
  animation: spin 4s linear infinite;
}

.ring-layer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid; /* Color defined inline for depth */
  box-shadow: 0 0 2px rgba(234, 179, 8, 0.2); /* Subtle glow per layer */
}

/* Add a stronger glow to the whole assembly */
.ring-3d::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(234,179,8,0.4) 0%, transparent 70%);
  transform: rotateX(90deg) scale(0.8);
  filter: blur(4px);
  pointer-events: none;
}

@keyframes spin {
  0% { transform: rotateY(0deg) rotateX(15deg); }
  100% { transform: rotateY(360deg) rotateX(15deg); }
}
</style>
