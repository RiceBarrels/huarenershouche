// 车辆枚举 → schema.org 取值(JSON-LD 用)。库里的 fuel_type / transmission 存中文枚举,
// drivetrain 存 AWD/FWD/RWD/4WD;认不出的值返回 undefined,调用方省略该属性(序列化时自动去掉)。

const FUEL_TYPES = new Map<string, string>([
  ["汽油", "Gasoline"],
  ["纯电", "Electric"],
  ["混动", "Hybrid"],
  ["插电混动", "Plug-in Hybrid"],
  ["柴油", "Diesel"],
  ["氢燃料", "Hydrogen"],
]);

const TRANSMISSIONS = new Map<string, string>([
  ["AT 自动", "Automatic"],
  ["自动", "Automatic"],
  ["CVT 无级", "CVT"],
  ["MT 手动", "Manual"],
  ["手动", "Manual"],
  ["单速(电动车)", "Single-speed"],
]);

// 部分转载源写 4X4,与 4WD 同义
const DRIVE_CONFIGURATIONS = new Map<string, string>([
  ["AWD", "https://schema.org/AllWheelDriveConfiguration"],
  ["FWD", "https://schema.org/FrontWheelDriveConfiguration"],
  ["RWD", "https://schema.org/RearWheelDriveConfiguration"],
  ["4WD", "https://schema.org/FourWheelDriveConfiguration"],
  ["4X4", "https://schema.org/FourWheelDriveConfiguration"],
]);

/** Vehicle.fuelType */
export function schemaFuelType(fuelType: string | null | undefined): string | undefined {
  return fuelType ? FUEL_TYPES.get(fuelType.trim()) : undefined;
}

/** Vehicle.vehicleTransmission */
export function schemaTransmission(transmission: string | null | undefined): string | undefined {
  return transmission ? TRANSMISSIONS.get(transmission.trim()) : undefined;
}

/** Vehicle.driveWheelConfiguration(DriveWheelConfigurationValue 枚举 URL) */
export function schemaDriveWheelConfiguration(
  drivetrain: string | null | undefined,
): string | undefined {
  return drivetrain ? DRIVE_CONFIGURATIONS.get(drivetrain.trim().toUpperCase()) : undefined;
}
