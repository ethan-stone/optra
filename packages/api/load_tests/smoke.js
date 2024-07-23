import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
	vus: 10,
	duration: '2m',
	summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'p(99.99)', 'count'],
};

const accessToken = JSON.parse(open('./access-token.json'));

export default function main() {
	const res = http.post(
		'https://imvoqg7k6b.execute-api.us-east-1.amazonaws.com/v1/tokens.verifyToken',
		JSON.stringify({
			token: accessToken.accessToken,
		}),
		{
			headers: {
				'Content-Type': 'application/json',
			},
		},
	);
	check(res, {
		'status is 200': (r) => r.status === 200,
	});
	sleep(1);
}
