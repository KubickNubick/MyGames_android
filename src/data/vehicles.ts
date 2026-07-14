/**
 * Параметры машин. ВСЕ числа физики/баланса — только здесь (инвариант №5).
 * Система координат мира: метры, ось Y вниз (гравитация +9.8).
 * Якоря осей вычислены по арту (см. src/data/sprites.ts и docs/ASSET_VERIFICATION.md).
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface VehicleParams {
  id: string;
  chassis: {
    /** Полуширина/полувысота полигона шасси, м. */
    halfWidth: number;
    halfHeight: number;
    density: number;
    friction: number;
  };
  /** Точки крепления WheelJoint от центра шасси, м (Y вниз). */
  axles: {
    rear: Point2;
    front: Point2;
  };
  wheel: {
    radius: number;
    density: number;
    friction: number;
  };
  engine: {
    /** Макс. торк мотора, Н·м на ведущее колесо. */
    torque: number;
    /** Макс. угловая скорость колеса, рад/с. */
    maxWheelSpeed: number;
  };
  brake: {
    /** Тормозной торк (мотор к нулю), Н·м. */
    torque: number;
    /** Порог скорости (м/с), ниже которого тормоз переходит в задний ход. */
    reverseBelowSpeed: number;
    /** Доля maxWheelSpeed для заднего хода. */
    reverseSpeedFactor: number;
  };
  suspension: {
    frequencyHz: number;
    dampingRatio: number;
  };
  /** Явный угловой момент для флипов в воздухе, Н·м. */
  airTorque: number;
  /** Полный привод: мотор и на переднем колесе. */
  fourWheelDrive: boolean;
  /** Доля торка на передок при 4WD. */
  frontTorqueShare: number;
  /** Слабое сопротивление качению при отпущенном газе, Н·м. */
  rollingResistanceTorque: number;
  /** Сенсор головы водителя: центр от центра шасси (Y вниз — отрицательный = выше), радиус, м. */
  head: {
    x: number;
    y: number;
    radius: number;
  };
}

/** Стартовый Jeep — значения из docs/PLAN.md, фаза 1. */
export const JEEP: VehicleParams = {
  id: 'jeep',
  chassis: {
    halfWidth: 1.0, // 2.0 м длина
    halfHeight: 0.4, // 0.8 м высота
    density: 150, // ~240 кг
    friction: 0.3,
  },
  axles: {
    rear: { x: -0.471, y: 0.318 },
    front: { x: 0.525, y: 0.318 },
  },
  wheel: {
    radius: 0.35,
    density: 60,
    friction: 2.2,
  },
  engine: {
    torque: 300,
    maxWheelSpeed: 40, // ~50 км/ч
  },
  brake: {
    torque: 600,
    reverseBelowSpeed: 0.4,
    reverseSpeedFactor: 0.5,
  },
  suspension: {
    frequencyHz: 3.5,
    dampingRatio: 0.7,
  },
  airTorque: 250,
  fourWheelDrive: false,
  frontTorqueShare: 0.4,
  rollingResistanceTorque: 12,
  head: {
    x: -0.1,
    y: -0.55,
    radius: 0.22,
  },
};

export const VEHICLES: Record<string, VehicleParams> = {
  jeep: JEEP,
};
