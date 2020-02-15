/*
 * Copyright 2000-2020 Sergio Rando <segio.rando@yahoo.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

import { getTickCounter } from "./../../../include/time.js"
import { bindEvent, unbindEvent } from "./../../../include/event.js"
import { SoundImpl } from "./../../../include/sound.js"
import { Mixer } from "./mixer.js"

export const VOLUME_MIN = 0.00000001;
export const VOLUME_MAX = 1;

export class VolumeFx {
	/**
		* @param {Sound} oSound 
		* @param {number} fTimeout 
		* @param {number} fSpeed 
		*/
	constructor(oSound, fTimeout, fSpeed) {
		let uNow = getTickCounter();

		this.oSound = oSound;
		this.fTimeout = uNow + fTimeout;
		this.fTimeStartIn = uNow - (oSound.fVolumeFxScale * fSpeed);
	
		let fVolume = oSound.fVolumeFxScale + (fTimeout / fSpeed);
		if (fVolume > 1.0) fVolume = 1.0;
	
		this.fTimeStartOut = this.fTimeout - ((1.0 - fVolume) * fSpeed);
	
		oSound.oMixer.dictSoundFx[oSound.sKey] = oSound;
	
		this.fSpeed = fSpeed;
	}

	release() {
		if (this.oSound) {
			if (this.oSound.sKey !== null) {
				delete this.oSound.oMixer.dictSoundFx[this.oSound.sKey];
			}
			this.oSound.oVolumeFx = null;
			this.oSound = null;
		}
	}

	update() {
		let uNow = getTickCounter();

		if (uNow < this.fTimeout) {
			let fElapsed = uNow - this.fTimeStartIn;
			let fVolume = fElapsed / this.fSpeed;
			if (fVolume > 1.0) fVolume = 1.0;
			this.oSound.fVolumeFxScale = fVolume;
			this.oSound.bInvalid = true;
			this.oSound.update();
		} else {
			let fElapsed = uNow - this.fTimeStartOut;
			let fVolume = 1.0 - fElapsed / this.fSpeed;
			if (fVolume < 0.0) fVolume = 0.0;
			this.oSound.fVolumeFxScale = fVolume;
			this.oSound.bInvalid = true;
			this.oSound.update();
			if (fVolume <= 0.0) {
				this.oSound.pause(true);
				this.release();
			}
		}
	}
}

/**
 * @this {Sound}
 */
function evEnded() {
	if (!this.bLoop)
		this.bPlaying = false;
}

export class Sound extends SoundImpl {
	/**
		* @param {string} sKey 
		* @param {Mixer} oMixer 
		* @param {HTMLAudioElement} domAudio 
		*/
	constructor(sKey, oMixer, domAudio) {
		super(sKey, domAudio);

		this.oMixer = oMixer;

		this.fVolume = VOLUME_MIN;
	
		this.bPlaying = false;
		this.bLoop = false;
		this.bPaused = false;
	
		this.bInvalid = false;
	
		this.fVolumeFxScale = 1.0;
		/** @type {VolumeFx} */ this.oVolumeFx = null;
	
		bindEvent(this.domAudio, 'ended', evEnded);
	}

	release() {
		if (this.sKey !== null) {
			delete(this.oMixer.dictSounds[this.sKey]);
		}
		this.stop();
		unbindEvent(this.domAudio, 'ended', evEnded);
		this.oMixer.unregister(this.domAudio);
		this.oMixer = null;
		this.domAudio = null;
	}

	update() {
		if (this.bInvalid) {
			this.bInvalid = false;

			if (this.fVolume < 0) {
				let fVolume = -this.fVolume * this.fVolumeFxScale;
				if (fVolume > VOLUME_MAX) fVolume = VOLUME_MAX;
				else if (fVolume < VOLUME_MIN) fVolume = VOLUME_MIN;
				this.domAudio.volume = fVolume;
			} else if (this.oMixer.fMixerVolume == 0) {
				this.domAudio.volume = VOLUME_MIN;
			} else {
				let fVolume = this.fVolume * this.fVolumeFxScale;
				if (fVolume > VOLUME_MAX) fVolume = VOLUME_MAX;
				fVolume = fVolume * this.oMixer.fMixerVolume / this.oMixer.fMixerMaxVolume;
				if (fVolume < VOLUME_MIN) fVolume = VOLUME_MIN;
				this.domAudio.volume = fVolume;
			}
		}
	}

	/**
		* @param {number} fVolume 
		*/
	setVolume(fVolume) {
		this.fVolume = fVolume;
		this.fVolumeFxScale = 1.0;
		this.bInvalid = true;
		this.update();
	}

	/**
		* @param {boolean} bLoop 
		* @param {number} fVolume 
		* @param {boolean=} bReset 
		*/
	playEx(bLoop, fVolume, bReset) {
		if (bReset)
			this.domAudio.currentTime = 0;

		this.bLoop = bLoop;
		this.domAudio.loop = bLoop;

		this.setVolume(fVolume);

		if ((this.bPaused) || (!this.bPlaying)) {
			this.bPlaying = true;
			this.bPaused = false;

			this.domAudio.play();
		}
	}

	/**
		* @param {boolean} bLoop 
		* @param {number} fVolume 
		* @param {boolean=} bReset 
		*/
	play(bLoop, fVolume, bReset) {
		if ((bReset) || (!this.bPlaying) || (this.bPaused)) {
			this.fVolumeFxScale = 1.0;
			if (this.oVolumeFx)
				this.oVolumeFx.release();
		}

		this.playEx(bLoop, fVolume, bReset);
	}

	pause(bPause = true) {
		if (bPause) {
			if (!this.bPaused) {
				this.bPaused = true;

				this.domAudio.pause();
			}
		} else {
			if ((this.bPaused) || (!this.bPlaying)) {
				this.bPlaying = true;
				this.bPaused = false;

				this.domAudio.play();
			}
		}
	}

	stop() {
		if (this.bPlaying) {
			this.bPlaying = false;
			this.bPaused = false;

			this.fVolumeFxScale = 1.0;
			if (this.oVolumeFx)
				this.oVolumeFx.release();

			this.domAudio.pause();
			this.domAudio.currentTime = 0;
		}
	}

	/**
		* @param {boolean} bLoop 
		* @param {number} fVolume 
		* @param {boolean} bReset 
		* @param {number} fTimeout 
		* @param {number} fSpeed 
		*/
	playTimeout(bLoop, fVolume, bReset, fTimeout, fSpeed) {
		if ((bReset) || (!this.bPlaying) || (this.bPaused))
			this.fVolumeFxScale = 1.0;

		this.play(bLoop, fVolume, bReset);
		this.oVolumeFx = new VolumeFx(this, fTimeout, fSpeed);
	}

	/** @returns {number} */
	left() {
		if (this.bPlaying) {
			let fTime = (this.domAudio.duration - this.domAudio.currentTime);
			if (fTime < 0) fTime = 0;
			return fTime;
		}

		return 0;
	}
}
