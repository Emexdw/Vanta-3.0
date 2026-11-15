import React from 'react';
import { Plus } from 'lucide-react';
import { Story } from '../types';
import { soundEngine } from '../utils/audioSynth';

interface StoriesRowProps {
  stories: Story[];
  onSelectStory: (index: number) => void;
  onCreateStory: () => void;
}

export const StoriesRow: React.FC<StoriesRowProps> = ({ stories, onSelectStory, onCreateStory }) => {
  return (
    // data-no-swipe: evita que el scroll horizontal de historias cambie entre Feed y Clips
    <div data-no-swipe className="w-full overflow-x-auto no-scrollbar py-3 px-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-4 min-w-max">
        <button
          onClick={() => {
            soundEngine.playTap();
            onCreateStory();
          }}
          className="flex flex-col items-center group cursor-pointer"
        >
          <div className="w-[68px] h-[74px] rounded-2xl bg-[#141418] border border-white/10 group-hover:border-white/30 p-1 flex flex-col items-center justify-center transition-all">
            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 stroke-[2.5px]" />
            </div>
            <span className="text-[10px] text-zinc-300 font-medium mt-1.5 leading-tight text-center">
              Tu historia
            </span>
          </div>
        </button>

        {stories.map((story, index) => (
          <button
            key={story.id}
            onClick={() => {
              soundEngine.playTap();
              onSelectStory(index);
            }}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div
              className={`w-[66px] h-[66px] rounded-full p-[2px] transition-all ${
                story.hasViewed
                  ? 'bg-zinc-800'
                  : 'bg-gradient-to-tr from-white via-zinc-400 to-zinc-600 group-hover:from-white group-hover:to-white'
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-black p-0.5">
                <img
                  src={story.user.avatar}
                  alt={story.user.username}
                  className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium mt-2 max-w-[68px] truncate group-hover:text-white transition-colors">
              @{story.user.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
