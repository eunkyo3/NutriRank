-- 검색용 FTS5 인덱스 (mvp-scope-screens §4.1 유사어 검색). trigram 토크나이저는
-- 한글을 3자 단위로 색인해 부분일치·유사어·오타(OR 트라이그램) 검색을 지원한다.
-- Drizzle 스키마로 모델링 불가한 가상 테이블이라 수기 마이그레이션으로 둔다.
-- 내용은 파이프라인(swapAndRecompute)이 product 스냅샷에서 재빌드한다.
CREATE VIRTUAL TABLE `product_fts` USING fts5(
	food_code UNINDEXED,
	name,
	manufacturer,
	tokenize = 'trigram'
);
