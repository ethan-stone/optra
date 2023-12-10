type TokenBucketConfig = {
	size: number;
	refillAmount: number;
	refillInterval: number;
	tokens: number;
};

export class TokenBucket {
	private lastRefillTime: Date = new Date();

	constructor(private config: TokenBucketConfig) {}

	getTokens(num: number): boolean {
		if (this.canConsume(num)) {
			this.config.tokens -= num;
			return true;
		}
		return false;
	}

	canConsume(num: number): boolean {
		if (this.config.tokens + this.calculateNewTokens() >= num) {
			return true;
		}

		return false;
	}

	calculateNewTokens(): number {
		const now = new Date();

		const timePassed = now.getTime() - this.lastRefillTime.getTime();

		let newTokens = Math.floor(timePassed * (this.config.refillAmount / this.config.refillInterval));

		if (this.config.tokens + newTokens > this.config.size) {
			newTokens = this.config.size - this.config.tokens;
		}

		this.config.tokens = Math.min(this.config.size, this.config.tokens + newTokens);

		this.lastRefillTime = now;

		return newTokens;
	}
}
