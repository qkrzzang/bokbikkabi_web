-- 공인중개사 정보 Master 테이블 생성
CREATE TABLE IF NOT EXISTS agent_master (
    id BIGSERIAL PRIMARY KEY,
    agent_name VARCHAR(255) NOT NULL,
    agent_number VARCHAR(50) NOT NULL UNIQUE,
    agent_type VARCHAR(50),
    road_address TEXT,
    lot_address TEXT,
    phone_number VARCHAR(20),
    registration_date DATE,
    insurance_joined BOOLEAN DEFAULT FALSE,
    representative_name VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    assistant_count INTEGER DEFAULT 0,
    agent_count INTEGER DEFAULT 0,
    website_url VARCHAR(500),
    data_reference_date DATE,
    provider_code VARCHAR(50),
    provider_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_agent_master_agent_number ON agent_master(agent_number);
CREATE INDEX idx_agent_master_agent_name ON agent_master(agent_name);
CREATE INDEX idx_agent_master_location ON agent_master(latitude, longitude);
CREATE INDEX idx_agent_master_provider_code ON agent_master(provider_code);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_agent_master_updated_at
    BEFORE UPDATE ON agent_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 코멘트 추가 (PostgreSQL은 COMMENT ON 구문 사용)
COMMENT ON TABLE agent_master IS '공인중개사 정보 Master 테이블';
COMMENT ON COLUMN agent_master.id IS '고유 ID';
COMMENT ON COLUMN agent_master.agent_name IS '중개사무소명';
COMMENT ON COLUMN agent_master.agent_number IS '개설등록번호';
COMMENT ON COLUMN agent_master.agent_type IS '개업공인중개사종별구분';
COMMENT ON COLUMN agent_master.road_address IS '소재지도로명주소';
COMMENT ON COLUMN agent_master.lot_address IS '소재지지번주소';
COMMENT ON COLUMN agent_master.phone_number IS '전화번호';
COMMENT ON COLUMN agent_master.registration_date IS '개설등록일자';
COMMENT ON COLUMN agent_master.insurance_joined IS '공제가입유무';
COMMENT ON COLUMN agent_master.representative_name IS '대표자명';
COMMENT ON COLUMN agent_master.latitude IS '위도';
COMMENT ON COLUMN agent_master.longitude IS '경도';
COMMENT ON COLUMN agent_master.assistant_count IS '중개보조원수';
COMMENT ON COLUMN agent_master.agent_count IS '소속공인중개사수';
COMMENT ON COLUMN agent_master.website_url IS '홈페이지주소';
COMMENT ON COLUMN agent_master.data_reference_date IS '데이터기준일자';
COMMENT ON COLUMN agent_master.provider_code IS '제공기관코드';
COMMENT ON COLUMN agent_master.provider_name IS '제공기관명';
COMMENT ON COLUMN agent_master.created_at IS '생성일시';
COMMENT ON COLUMN agent_master.updated_at IS '수정일시';
